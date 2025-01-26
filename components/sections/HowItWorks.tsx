export const HowItWorks = () => {
  return (
    <div className="max-w-4xl mx-auto mt-12 sm:mt-20 px-4">
      <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-12">
        How Does Windscreen Compare Work?
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
        {['Enter vehicle details', 'Choose your quote', 'Pay on completion'].map((text, index) => (
          <div key={index} className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-[#0FB8C1] text-white rounded-full flex items-center justify-center mb-4 font-bold">
              {index + 1}
            </div>
            <h3 className="font-semibold">{text}</h3>
          </div>
        ))}
      </div>
    </div>
  )
} 