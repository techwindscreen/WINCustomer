import Image from 'next/image'

export const Header = () => {
  return (
    <header className="bg-white py-2 sm:py-4 px-4 border-b">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <a
            href="https://windscreencompare.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block focus:outline-none focus:ring-2 focus:ring-[#0FB8C1] rounded"
          >
            <div className="relative w-[200px] sm:w-[300px] h-[60px] sm:h-[90px] cursor-pointer">
              <Image 
                src="/WCLOGO.jpg"
                alt="Windscreen Compare Logo"
                className="object-contain w-full h-full"
                width={250}
                height={60}
                priority
              />
            </div>
          </a>
          <nav className="w-full sm:w-auto">
            <ul className="flex flex-wrap justify-center sm:justify-end gap-4 text-sm">
              {/* Navigation items */}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  )
} 