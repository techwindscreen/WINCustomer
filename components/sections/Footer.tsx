export const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold mb-4 text-[#0FB8C1]">INFO</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-[#0FB8C1]">Windscreen Replacement</a></li>
              <li><a href="#" className="hover:text-[#0FB8C1]">Car Manufacturers</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
} 