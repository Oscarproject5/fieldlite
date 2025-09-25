import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getEncryptionMetrics,
  isEncrypted,
  clearKeyCache
} from '@/lib/encryption';

/**
 * Health monitoring endpoint for encryption system
 * Provides metrics, security scoring, and recommendations
 */

// Alert threshold configurations
const THRESHOLDS = {
  criticalSuccessRate: 50,    // Below this is critical
  warningSuccessRate: 80,     // Below this is warning
  criticalSecurityScore: 30,  // Below this is critical
  warningSecurityScore: 60,   // Below this is warning
  maxFailuresPerHour: 100,    // Maximum failures allowed per hour
  minCacheEfficiency: 30      // Minimum cache efficiency percentage
};

/**
 * GET - Return encryption health metrics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    // Only admins can access health metrics
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get encryption metrics
    const metrics = getEncryptionMetrics();

    // Parse numeric values from percentage strings
    const successRate = parseFloat(metrics.successRate);
    const securityScore = parseFloat(metrics.securityScore);
    const cacheEfficiency = parseFloat(metrics.cacheEfficiency);

    // Determine overall health status
    const healthStatus = determineHealthStatus(
      successRate,
      securityScore,
      metrics
    );

    // Check for any active alerts
    const alerts = generateAlerts(
      successRate,
      securityScore,
      cacheEfficiency,
      metrics
    );

    // Get tenant-specific encryption status if available
    let tenantEncryptionStatus = null;
    if (profile?.tenant_id) {
      const { data: twilioConfig } = await supabase
        .from('twilio_configurations')
        .select('encryption_version, last_migration, auth_token')
        .eq('tenant_id', profile.tenant_id)
        .single();

      if (twilioConfig) {
        tenantEncryptionStatus = {
          version: twilioConfig.encryption_version || 'unknown',
          lastMigration: twilioConfig.last_migration,
          isEncrypted: isEncrypted(twilioConfig.auth_token),
          requiresMigration: !twilioConfig.auth_token.startsWith('v2:')
        };
      }
    }

    // Calculate trend indicators
    const trends = calculateTrends(metrics);

    // Build comprehensive health response
    const healthReport = {
      status: healthStatus,
      timestamp: new Date().toISOString(),
      metrics: {
        encryption: {
          attempts: metrics.encryptionAttempts,
          successes: metrics.encryptionSuccesses,
          failures: metrics.encryptionFailures,
          successRate: metrics.successRate
        },
        decryption: {
          attempts: metrics.decryptionAttempts,
          successes: metrics.decryptionSuccesses,
          failures: metrics.decryptionFailures,
          successRate: `${calculateRate(
            metrics.decryptionSuccesses,
            metrics.decryptionAttempts
          ).toFixed(2)}%`,
          fallbacks: metrics.fallbackDecryptions
        },
        methodDistribution: metrics.methodUsage,
        cache: {
          hits: metrics.cacheHits,
          misses: metrics.cacheMisses,
          efficiency: metrics.cacheEfficiency
        },
        selfHealing: {
          reencryptions: metrics.selfHealingReencryptions
        }
      },
      scores: {
        overall: securityScore,
        success: successRate,
        cache: cacheEfficiency
      },
      alerts,
      recommendations: metrics.recommendations,
      tenantStatus: tenantEncryptionStatus,
      trends,
      thresholds: THRESHOLDS
    };

    return NextResponse.json(healthReport);

  } catch (error: any) {
    console.error('[Health Check Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve health metrics',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Perform maintenance actions
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Only super admins can perform maintenance
    if (profile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    let result: any = {};

    switch (action) {
      case 'clear_cache':
        clearKeyCache();
        result = { message: 'Key cache cleared successfully' };
        break;

      case 'reset_metrics':
        // This would reset the metrics object in the encryption module
        // Note: Metrics reset is not implemented in the current module
        // but could be added as a function
        result = {
          message: 'Metrics reset not implemented',
          action: 'Would reset all encryption metrics to zero'
        };
        break;

      case 'force_migration':
        // Trigger migration for all legacy encrypted data
        result = await forceMigrationForTenant(supabase, profile.tenant_id);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Maintenance Action Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to perform maintenance action',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Determine overall health status based on metrics
 */
function determineHealthStatus(
  successRate: number,
  securityScore: number,
  metrics: any
): string {
  // Critical status conditions
  if (
    successRate < THRESHOLDS.criticalSuccessRate ||
    securityScore < THRESHOLDS.criticalSecurityScore ||
    metrics.methodUsage.plaintext > 0
  ) {
    return 'critical';
  }

  // Warning status conditions
  if (
    successRate < THRESHOLDS.warningSuccessRate ||
    securityScore < THRESHOLDS.warningSecurityScore ||
    metrics.methodUsage.legacy > metrics.methodUsage.pbkdf2
  ) {
    return 'warning';
  }

  // Healthy status
  return 'healthy';
}

/**
 * Generate alerts based on current metrics
 */
function generateAlerts(
  successRate: number,
  securityScore: number,
  cacheEfficiency: number,
  metrics: any
): Array<{
  level: 'critical' | 'warning' | 'info';
  message: string;
  metric: string;
  value: any;
}> {
  const alerts = [];

  // Critical alerts
  if (metrics.methodUsage.plaintext > 0) {
    alerts.push({
      level: 'critical' as const,
      message: 'Plaintext sensitive data detected',
      metric: 'plaintext_usage',
      value: metrics.methodUsage.plaintext
    });
  }

  if (successRate < THRESHOLDS.criticalSuccessRate) {
    alerts.push({
      level: 'critical' as const,
      message: `Success rate critically low: ${successRate.toFixed(2)}%`,
      metric: 'success_rate',
      value: successRate
    });
  }

  if (securityScore < THRESHOLDS.criticalSecurityScore) {
    alerts.push({
      level: 'critical' as const,
      message: `Security score critically low: ${securityScore.toFixed(2)}%`,
      metric: 'security_score',
      value: securityScore
    });
  }

  // Warning alerts
  if (metrics.methodUsage.legacy > metrics.methodUsage.pbkdf2) {
    alerts.push({
      level: 'warning' as const,
      message: 'Majority of encryption using legacy method',
      metric: 'legacy_usage',
      value: {
        legacy: metrics.methodUsage.legacy,
        pbkdf2: metrics.methodUsage.pbkdf2
      }
    });
  }

  if (successRate < THRESHOLDS.warningSuccessRate && successRate >= THRESHOLDS.criticalSuccessRate) {
    alerts.push({
      level: 'warning' as const,
      message: `Success rate below threshold: ${successRate.toFixed(2)}%`,
      metric: 'success_rate',
      value: successRate
    });
  }

  if (cacheEfficiency < THRESHOLDS.minCacheEfficiency) {
    alerts.push({
      level: 'warning' as const,
      message: `Cache efficiency low: ${cacheEfficiency.toFixed(2)}%`,
      metric: 'cache_efficiency',
      value: cacheEfficiency
    });
  }

  // Info alerts
  if (metrics.selfHealingReencryptions > 0) {
    alerts.push({
      level: 'info' as const,
      message: `${metrics.selfHealingReencryptions} items automatically re-encrypted`,
      metric: 'self_healing',
      value: metrics.selfHealingReencryptions
    });
  }

  return alerts;
}

/**
 * Calculate trends based on metrics
 */
function calculateTrends(metrics: any): {
  improving: string[];
  degrading: string[];
  stable: string[];
} {
  const trends = {
    improving: [] as string[],
    degrading: [] as string[],
    stable: [] as string[]
  };

  // Check for improving trends
  if (metrics.methodUsage.pbkdf2 > 0) {
    trends.improving.push('Enhanced encryption adoption');
  }

  if (metrics.selfHealingReencryptions > 0) {
    trends.improving.push('Automatic security upgrades active');
  }

  if (metrics.cacheHits > metrics.cacheMisses) {
    trends.improving.push('Cache performance optimized');
  }

  // Check for degrading trends
  if (metrics.methodUsage.plaintext > 0) {
    trends.degrading.push('Plaintext data exposure');
  }

  if (metrics.encryptionFailures > metrics.encryptionSuccesses * 0.1) {
    trends.degrading.push('High encryption failure rate');
  }

  if (metrics.fallbackDecryptions > metrics.decryptionSuccesses * 0.5) {
    trends.degrading.push('Excessive fallback usage');
  }

  // Check for stable trends
  const totalOps = metrics.encryptionAttempts + metrics.decryptionAttempts;
  const totalFailures = metrics.encryptionFailures + metrics.decryptionFailures;

  if (totalOps > 0 && totalFailures / totalOps < 0.05) {
    trends.stable.push('Low overall failure rate');
  }

  return trends;
}

/**
 * Calculate success rate percentage
 */
function calculateRate(successes: number, attempts: number): number {
  return attempts > 0 ? (successes / attempts) * 100 : 100;
}

/**
 * Force migration for tenant's encrypted data
 */
async function forceMigrationForTenant(supabase: any, tenantId: string) {
  try {
    // Get all Twilio configurations for the tenant
    const { data: configs, error } = await supabase
      .from('twilio_configurations')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error || !configs || configs.length === 0) {
      return {
        message: 'No configurations found for migration',
        migratedCount: 0
      };
    }

    let migratedCount = 0;
    const migrationResults = [];

    for (const config of configs) {
      if (!config.auth_token.startsWith('v2:')) {
        // Import reencryptWithEnhancedSecurity dynamically to avoid circular dependencies
        const { reencryptWithEnhancedSecurity } = await import('@/lib/encryption');

        try {
          const { newEncrypted, wasLegacy } = await reencryptWithEnhancedSecurity(
            config.auth_token,
            config.account_sid
          );

          const { error: updateError } = await supabase
            .from('twilio_configurations')
            .update({
              auth_token: newEncrypted,
              encryption_version: 'v2',
              last_migration: new Date().toISOString()
            })
            .eq('id', config.id);

          if (!updateError) {
            migratedCount++;
            migrationResults.push({
              configId: config.id,
              fromMethod: wasLegacy ? 'legacy' : 'plaintext',
              status: 'success'
            });
          } else {
            migrationResults.push({
              configId: config.id,
              status: 'failed',
              error: updateError.message
            });
          }
        } catch (migrationError: any) {
          migrationResults.push({
            configId: config.id,
            status: 'failed',
            error: migrationError.message
          });
        }
      }
    }

    return {
      message: `Migration completed for ${migratedCount} configurations`,
      migratedCount,
      details: migrationResults
    };

  } catch (error: any) {
    console.error('[Force Migration Error]', error);
    throw new Error(`Migration failed: ${error.message}`);
  }
}

/**
 * DELETE - Clear specific cache or metrics
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Only super admins can clear data
    if (profile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    // Clear the key cache
    clearKeyCache();

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Clear Cache Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to clear cache',
        details: error.message
      },
      { status: 500 }
    );
  }
}