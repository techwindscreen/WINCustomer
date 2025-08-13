// Utility functions for permanent magic links for winback campaigns

export interface PermanentMagicLinkOptions {
  quoteId: string;
  email: string;
}

export interface PermanentMagicLinkResponse {
  success: boolean;
  permanentMagicLink?: string;
  error?: string;
  tokenId?: string;
  quoteName?: string;
  quotePrice?: number;
}

/**
 * Generate a permanent magic link for a quote (for winback campaigns)
 * Unlike regular magic links, these don't expire and can be used multiple times
 */
export async function generatePermanentMagicLink(options: PermanentMagicLinkOptions): Promise<PermanentMagicLinkResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : '');
    
    const response = await fetch(`${baseUrl}/api/generate-permanent-magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteId: options.quoteId,
        email: options.email,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to generate permanent magic link' };
    }

    return { 
      success: true, 
      permanentMagicLink: data.permanentMagicLink,
      tokenId: data.tokenId,
      quoteName: data.quoteName,
      quotePrice: data.quotePrice
    };
  } catch (error) {
    console.error('Error generating permanent magic link:', error);
    return { success: false, error: 'Failed to generate permanent magic link' };
  }
}

/**
 * Get permanent magic link for email templates
 * This function can be used in Klaviyo or other email templates
 */
export function getPermanentMagicLinkForEmail(quoteId: string, email: string): string {
  // For use in email templates - returns the API endpoint that can be called
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com';
  return `${baseUrl}/api/get-permanent-link?quoteId=${encodeURIComponent(quoteId)}&email=${encodeURIComponent(email)}`;
}

/**
 * Validate permanent magic link token
 */
export async function validatePermanentMagicLink(token: string): Promise<{ valid: boolean; quoteData?: any; error?: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : '');
    
    const response = await fetch(`${baseUrl}/api/verify-permanent-magic-link?token=${encodeURIComponent(token)}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      return { valid: false, error: errorData.message || 'Invalid link' };
    }

    const data = await response.json();
    return { valid: true, quoteData: data.quoteData };
  } catch (error) {
    console.error('Error validating permanent magic link:', error);
    return { valid: false, error: 'Failed to validate link' };
  }
}

/**
 * Deactivate a permanent magic link (useful for security or if customer requests)
 */
export async function deactivatePermanentMagicLink(quoteId: string, email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : '');
    
    const response = await fetch(`${baseUrl}/api/deactivate-permanent-magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteId: quoteId,
        email: email,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to deactivate link' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deactivating permanent magic link:', error);
    return { success: false, error: 'Failed to deactivate link' };
  }
}