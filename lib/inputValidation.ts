export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>'"&]/g, '') // Remove HTML/script injection characters
    .replace(/\0/g, '') // Remove null bytes
    .trim()
    .slice(0, 1000); // Limit length
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePostcode = (postcode: string): boolean => {
  // UK postcode validation
  const postcodeRegex = /^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][ABD-HJLNP-UW-Z]{2}$/i;
  return postcodeRegex.test(postcode.replace(/\s+/g, ' ').trim());
};

export const validateVehicleReg = (reg: string): boolean => {
  // UK vehicle registration validation (basic)
  const regRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{3}$|^[A-Z][0-9]{1,3}[A-Z]{3}$|^[A-Z]{3}[0-9]{1,3}[A-Z]$/i;
  return regRegex.test(reg.replace(/\s+/g, ''));
};

export const validatePhoneNumber = (phone: string): boolean => {
  // UK phone number validation
  const phoneRegex = /^(\+44|0)[1-9]\d{8,9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
};

export const sanitizeQuoteId = (quoteId: string): string => {
  // Only allow alphanumeric and hyphens for quote IDs
  return quoteId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 50);
};

export const validateAmount = (amount: number): boolean => {
  return typeof amount === 'number' && 
         amount > 0 && 
         amount < 10000 && // Max £10,000
         Number.isFinite(amount);
};

export const validateQuoteData = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.vehicleReg || !validateVehicleReg(data.vehicleReg)) {
    errors.push('Invalid vehicle registration');
  }

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Invalid email address');
  }

  if (data.mobile && !validatePhoneNumber(data.mobile)) {
    errors.push('Invalid phone number');
  }

  if (data.postcode && !validatePostcode(data.postcode)) {
    errors.push('Invalid postcode');
  }

  if (data.amount && !validateAmount(data.amount)) {
    errors.push('Invalid amount');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}; 