import { supabase } from './supabaseClient';

interface MagicLinkOptions {
    quoteId: string;
    email: string;
    customerName?: string;
}

interface MagicLinkResponse {
    success: boolean;
    magicLink?: string;
    error?: string;
}

export async function generateMagicLink(options: MagicLinkOptions): Promise<MagicLinkResponse> {
    try {
        const response = await fetch('/api/generate-magic-link', {
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
            return { success: false, error: data.message || 'Failed to generate magic link' };
        }

        return { success: true, magicLink: data.magicLink };
    } catch (error) {
        console.error('Error generating magic link:', error);
        return { success: false, error: 'Failed to generate magic link' };
    }
}

export async function sendMagicLinkEmail(options: MagicLinkOptions & { magicLink: string }): Promise<boolean> {
    try {
        // Email template for magic link
        const emailTemplate = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #0FB8C1; margin: 0;">WindscreenCompare</h1>
                    <p style="color: #666; margin: 5px 0;">Quick Access to Your Quote</p>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
                    <h2 style="color: #333; margin-top: 0;">Hi ${options.customerName || 'there'}!</h2>
                    <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                        You can quickly access your windscreen replacement quote using the secure link below. 
                        This link will take you directly to your quote details.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${options.magicLink}" 
                           style="background: #0FB8C1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            View Your Quote
                        </a>
                    </div>
                    
                    <p style="color: #999; font-size: 14px; margin-bottom: 0;">
                        <strong>Quote ID:</strong> ${options.quoteId}<br>
                        <strong>Valid for:</strong> 24 hours from now
                    </p>
                </div>
                
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px;">
                    <p style="color: #856404; margin: 0; font-size: 14px;">
                        <strong>Security Note:</strong> This link is unique to you and expires in 24 hours. 
                        Don't share it with others.
                    </p>
                </div>
                
                <div style="text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;">
                    <p>If you have any questions, please contact us at support@windscreencompare.com</p>
                    <p>© 2024 WindscreenCompare. All rights reserved.</p>
                </div>
            </div>
        `;

        // Send via your existing email service
        const emailResponse = await fetch('/api/external-email-service', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: options.email,
                subject: `Quick Access to Your WindscreenCompare Quote (${options.quoteId})`,
                html: emailTemplate,
                type: 'magic_link'
            }),
        });

        return emailResponse.ok;
    } catch (error) {
        console.error('Error sending magic link email:', error);
        return false;
    }
}

export async function generateAndSendMagicLink(options: MagicLinkOptions): Promise<MagicLinkResponse> {
    try {
        // First generate the magic link
        const linkResult = await generateMagicLink(options);
        
        if (!linkResult.success || !linkResult.magicLink) {
            return linkResult;
        }

        // Then send the email
        const emailSent = await sendMagicLinkEmail({
            ...options,
            magicLink: linkResult.magicLink
        });

        if (!emailSent) {
            return { success: false, error: 'Failed to send email' };
        }

        return { success: true, magicLink: linkResult.magicLink };
    } catch (error) {
        console.error('Error in generateAndSendMagicLink:', error);
        return { success: false, error: 'Failed to generate and send magic link' };
    }
} 