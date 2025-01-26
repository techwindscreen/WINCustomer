export const ProgressSteps = () => {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-center mb-12 sm:mb-12">
      <h2 className="text-2xl sm:text-3xl font-bold w-full sm:w-[200px] mb-8 sm:mb-0 text-center sm:text-left"></h2>
      <div className="w-full sm:flex-1 flex justify-center md:-ml-20">
        <div className="w-full max-w-[300px] sm:max-w-[600px] pl-4 sm:pl-8 md:pl-0">
          <div className="flex items-center justify-center sm:justify-start md:justify-center">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center relative w-8">
                  <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 bg-white z-10 ${
                    step === 1 ? 'border-[#0FB8C1] text-[#0FB8C1]' : 'border-gray-300 text-gray-300'
                  }`}>
                    {step}
                  </div>
                  <span className="text-xs text-gray-500 mt-1 absolute -bottom-6 w-max">
                    {step === 1 ? 'Vehicle' : 
                     step === 2 ? 'Damage' : 
                     step === 3 ? 'Details' : 
                     'Payment'}
                  </span>
                </div>
                {step < 4 && (
                  <div className={`h-[2px] w-full ${
                    step === 1 ? 'bg-[#0FB8C1]' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 