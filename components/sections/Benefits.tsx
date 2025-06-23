import { Clock, Wallet, Shield } from 'lucide-react'

export const Benefits = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why Choose Windscreen Compare?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free service */}
          <div className="text-center">
            <div className="w-16 h-16 bg-[#0FB8C1] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Completely Free Service</h3>
            <p className="text-gray-600">
              No hidden fees, no charges. Compare quotes from local technicians at zero cost to you.
            </p>
          </div>

          {/* Quality service */}
          <div className="text-center">
            <div className="w-16 h-16 bg-[#0FB8C1] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Quality Guarantee</h3>
            <p className="text-gray-600">
              All our partner technicians are vetted professionals with insurance and quality guarantees.
            </p>
          </div>

          {/* Quick quotes */}
          <div className="text-center">
            <div className="w-16 h-16 bg-[#0FB8C1] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Quick & Easy Process</h3>
            <p className="text-gray-600">
              Get quotes in minutes, not hours. Simple process that works on any device.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
} 