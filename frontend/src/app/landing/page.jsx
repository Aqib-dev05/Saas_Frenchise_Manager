'use client'
import Link from 'next/link'
import { Check, Package, MapPin, Truck, BarChart3, Users, Shield, Star, ArrowRight, Zap } from 'lucide-react'

const FEATURES = [
  { icon: Package, title: 'Inventory Management', desc: 'Real-time stock tracking with low-stock alerts across all your products and categories.' },
  { icon: MapPin, title: 'Salesman Route Maps', desc: 'Visual route planning with interactive maps. Salesmen see their shops in order with one-tap order booking.' },
  { icon: Truck, title: 'Delivery Tracking', desc: 'Delivery dashboard with loading manifest. Mark deliveries complete and update shop balances automatically.' },
  { icon: BarChart3, title: 'Sales Analytics', desc: 'Daily, weekly and monthly revenue charts. Top shops, credit reports and outstanding balance tracking.' },
  { icon: Users, title: 'Multi-Role Access', desc: 'Separate dashboards for Admin, Salesman and Delivery. Each sees exactly what they need.' },
  { icon: Shield, title: 'Credit Management', desc: 'Track credit limits, outstanding balances per shop. Auto-update on delivery for credit accounts.' },
]

const PLANS = [
  {
    name: 'Starter', price: 19, yearlyPrice: 190, slug: 'starter', popular: false,
    features: ['3 Users', '2 Salesman Routes', '100 Shops', '50 Products', 'Basic Reports', 'Email Support'],
  },
  {
    name: 'Professional', price: 49, yearlyPrice: 490, slug: 'professional', popular: true,
    features: ['10 Users', '10 Salesman Routes', '500 Shops', '500 Products', 'Advanced Analytics', 'Map View', 'Invoice Management', 'Priority Support'],
  },
  {
    name: 'Enterprise', price: 99, yearlyPrice: 990, slug: 'enterprise', popular: false,
    features: ['Unlimited Users', 'Unlimited Routes', 'Unlimited Shops & Products', 'Custom Branding', 'API Access', 'Dedicated Support', 'SLA Guarantee'],
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* NAV */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg hidden sm:inline">FranchiseManager</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-2.5 sm:px-4 py-2">Login</Link>
            <Link href="/register" className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
              <span className="sm:hidden">Start Trial</span>
              <span className="hidden sm:inline">Start Free Trial</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-4 text-center bg-gradient-to-b from-indigo-50/50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Zap className="w-4 h-4" /> 14-day free trial — No credit card required
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            POS & Distribution<br />
            <span className="text-indigo-600">Built for Franchises</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            Manage your entire franchise distribution — salesmen routes, order booking, delivery tracking, inventory and credit all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-colors">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-indigo-300 text-gray-700 font-semibold px-8 py-3.5 rounded-xl text-base transition-colors">
              See Demo
            </Link>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="max-w-5xl mx-auto mt-16 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
          <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-2 text-slate-400 text-xs font-mono truncate">franchise-manager.app/admin</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6 bg-slate-50">
            {[['Today Revenue','Rs. 48,200','↑ 12%','green'],['Orders','34','↑ 8%','blue'],['Pending','6','','yellow'],['Low Stock','3','!','red']].map(([l,v,c,color]) => (
              <div key={l} className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium">{l}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{v}</p>
                <p className={`text-xs mt-1 font-medium ${color==='green'?'text-green-600':color==='blue'?'text-blue-600':color==='yellow'?'text-yellow-600':'text-red-500'}`}>{c}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Everything you need to run your franchise</h2>
          <p className="text-gray-500 text-center mb-14 max-w-xl mx-auto">From order booking on the road to delivery completion and admin oversight — one platform, every role.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all">
                <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500 text-center mb-14">Start with a 14-day free trial. No credit card required.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`relative bg-white rounded-2xl p-8 border-2 flex flex-col ${plan.popular ? 'border-indigo-500 shadow-xl shadow-indigo-100' : 'border-gray-100'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> Most Popular
                  </div>
                )}
                <h3 className="font-bold text-gray-900 text-lg mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">${plan.price}</span>
                  <span className="text-gray-400 mb-1">/month</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href={`/register?plan=${plan.slug}`}
                  className={`text-center font-semibold px-6 py-3 rounded-xl text-sm transition-colors ${plan.popular ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-4 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">FranchiseManager</span>
          </div>
          <p className="text-gray-400 text-sm">© 2024 FranchiseManager. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-900">Privacy</a>
            <a href="#" className="hover:text-gray-900">Terms</a>
            <a href="#" className="hover:text-gray-900">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
