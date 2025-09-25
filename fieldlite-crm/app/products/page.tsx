'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Search,
  Plus,
  DollarSign,
  Filter,
  Archive,
  TrendingUp,
  BarChart
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  sku: string
  price: number
  cost: number
  quantity: number
  category: string
  status: string
  created_at: string
  updated_at: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading products:', error)
      } else {
        setProducts(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success'
      case 'inactive': return 'default'
      case 'out_of_stock': return 'destructive'
      case 'discontinued': return 'secondary'
      default: return 'default'
    }
  }

  const totalInventoryValue = products.reduce((sum, product) => sum + ((product.price || 0) * (product.quantity || 0)), 0)
  const activeProductsCount = products.filter(p => p.status?.toLowerCase() === 'active').length
  const lowStockCount = products.filter(p => (p.quantity || 0) < 10).length

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8" />
              Products
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product inventory and pricing
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalInventoryValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total value in stock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProductsCount}</div>
              <p className="text-xs text-muted-foreground">
                Available for sale
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockCount}</div>
              <p className="text-xs text-muted-foreground">
                Products below 10 units
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-8">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No products found</p>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                      </div>
                      <Badge variant={getStatusColor(product.status) as any}>
                        {product.status}
                      </Badge>
                    </div>

                    {product.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="font-semibold">${(product.price || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Stock</p>
                        <p className="font-semibold">{product.quantity || 0} units</p>
                      </div>
                    </div>

                    {product.category && (
                      <div className="pt-2">
                        <Badge variant="outline">{product.category}</Badge>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                      <Button variant="outline" size="sm" className="flex-1">View</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}