import { ApiKeySession, EventsApi, ProfilesApi } from 'klaviyo-api';

// Initialize Klaviyo with your private API key
const session = new ApiKeySession(process.env.KLAVIYO_PRIVATE_API_KEY || '');
const eventsApi = new EventsApi(session);
const profilesApi = new ProfilesApi(session);

// Klaviyo service for handling email campaigns and user tracking
// Using their latest API version (2024-05-15)

export interface QuoteCompletedData {
  vehicleReg: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  userLocation: string;
  selectedWindows: string[];
  windowDamage: Record<string, any>;
  specifications: string[];
  glassType: string;
  quotePrice: number;
  quoteId: string;
  timestamp: string;
  appointmentDate?: string;
  appointmentTime?: string;
  paymentOption?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
}

export class KlaviyoService {
  private static readonly API_BASE = 'https://a.klaviyo.com/api';
  private static readonly PRIVATE_KEY = process.env.KLAVIYO_PRIVATE_API_KEY;

  // Track when a user starts a quote (optional tracking)
  static async trackQuoteStarted(data: {
    vehicleReg: string;
    quoteId: string;
    userEmail?: string;
    userPhone?: string;
    timestamp: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    try {
      console.log('📊 Tracking quote started for:', data.quoteId);
      
      // This is optional tracking - if it fails, don't break the flow
      const payload = {
        data: {
          type: 'event',
          attributes: {
            properties: {
              vehicle_registration: data.vehicleReg,
              quote_id: data.quoteId,
              timestamp: data.timestamp,
              user_agent: data.userAgent,
              ip_address: data.ipAddress,
              source: 'windscreen-compare-website',
              event_type: 'quote_started'
            },
            metric: {
              data: {
                type: 'metric',
                attributes: {
                  name: 'Quote Started'
                }
              }
            },
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: data.userEmail || `quote-${data.quoteId}@temp.local`,
                  properties: {
                    phone_number: data.userPhone || '',
                    latest_quote_id: data.quoteId,
                    latest_vehicle_reg: data.vehicleReg
                  }
                }
              }
            },
            time: new Date().toISOString()
          }
        }
      };

      await KlaviyoService.makeAPICall('/events/', payload);
      console.log('✅ Quote started tracking successful');
    } catch (error) {
      console.warn('⚠️ Quote started tracking failed (non-critical):', error);
      // Don't throw error - this is optional tracking
    }
  }

  // Track when user completes quote form
  static async trackQuoteCompleted(data: QuoteCompletedData) {
    try {
      console.log('📊 Tracking quote completion for:', data.quoteId);

      const payload = {
        data: {
          type: 'event',
          attributes: {
            properties: {
              vehicle_registration: data.vehicleReg,
              quote_id: data.quoteId,
              quote_price: data.quotePrice,
              glass_type: data.glassType,
              selected_windows: data.selectedWindows,
              window_damage: data.windowDamage,
              specifications: data.specifications,
              timestamp: data.timestamp,
              appointment_date: data.appointmentDate,
              appointment_time: data.appointmentTime,
              payment_option: data.paymentOption,
              vehicle_make: data.vehicleMake,
              vehicle_model: data.vehicleModel,
              vehicle_year: data.vehicleYear,
              source: 'windscreen-compare-website',
              event_type: 'quote_completed'
            },
            metric: {
              data: {
                type: 'metric',
                attributes: {
                  name: 'Quote Completed'
                }
              }
            },
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: data.userEmail,
                  properties: {
                    first_name: data.userName.split(' ')[0] || '',
                    last_name: data.userName.split(' ').slice(1).join(' ') || '',
                    phone_number: data.userPhone,
                    location: data.userLocation,
                    latest_quote_id: data.quoteId,
                    latest_vehicle_reg: data.vehicleReg,
                    latest_quote_price: data.quotePrice,
                    latest_glass_type: data.glassType
                  }
                }
              }
            },
            time: new Date().toISOString()
          }
        }
      };

      await KlaviyoService.makeAPICall('/events/', payload);
      console.log('✅ Quote completion tracking successful');

      // Also trigger the quote completion email template
      // TODO: move this to a separate function for better organization
      // await KlaviyoService.sendQuoteCompletionEmail(data);

    } catch (error) {
      console.error('❌ Quote completion tracking failed:', error);
      throw error; // Re-throw since this is more critical
    }
  }

  // Track when a user completes the quote (submits contact info)
  // This only sends the admin notification - no customer tracking
  static async trackQuoteCompletedAdmin(data: QuoteCompletedData) {
    try {
      console.log('📧 Sending admin notification for quote completed');
      
      // Use the new sendAdminOrderNotification with enhanced data instead of basic sendAdminNotification
      await KlaviyoService.sendAdminOrderNotification({
        // Order information
        quote_id: data.quoteId,
        order_date: data.timestamp,
        
        // Customer information  
        user_name: data.userName,
        user_email: data.userEmail,
        user_phone: data.userPhone,
        user_location: data.userLocation || 'Not provided',
        
        // Vehicle information
        vehicle_registration: data.vehicleReg,
        // Note: Make/model/year not available in quote data, would need to be fetched
        vehicle_make: data.vehicleMake || 'To be confirmed',
        vehicle_model: data.vehicleModel || 'To be confirmed', 
        vehicle_year: data.vehicleYear || 'To be confirmed',
        
        // Service details
        glass_type: data.glassType,
        damage_type: data.selectedWindows.join(', '),
        special_requirements: data.specifications.join(', ') || 'None',
        
        // Pricing information
        total_price: data.quotePrice ? new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP'
        }).format(data.quotePrice) : 'Quote pending',
        
        // These will be filled in when payment is processed
        glass_price: 'TBD at payment',
        fitting_price: 'TBD at payment',
        vat_amount: 'TBD at payment',
        payment_method: 'Not yet paid',
        payment_type: 'Not yet paid',
        payment_status: 'QUOTE_COMPLETED',
        
        // Appointment details from contact form
        preferred_date: data.appointmentDate || 'TBD', 
        preferred_time: data.appointmentTime || 'TBD',
        appointment_type: 'mobile'
      });

      console.log('✅ Klaviyo: Admin notification sent');
    } catch (error) {
      console.error('❌ Klaviyo: Failed to send admin notification:', error);
    }
  }

  // Send admin notification email via Klaviyo
  static async sendAdminNotification(data: any) {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@windscreencompare.com';
      
      // Generate unique event ID to prevent email chaining for admin notifications
      const uniqueEventId = `admin_notification_${data.quote_id || data.quoteId}_${Date.now()}`;
      
      const payload = {
        data: {
          type: 'event',
          attributes: {
            properties: {
              // Main event data
              vehicle_registration: data.vehicle_registration || data.vehicleReg,
              quote_id: data.quote_id || data.quoteId,
              timestamp: data.timestamp,
              user_email: data.user_email || 'Not provided',
              user_phone: data.user_phone || 'Not provided',
              user_location: data.user_location || 'Not provided',
              source: 'windscreen-compare-website',
              
              // Admin notification specific properties
              notification_type: 'admin_alert',
              priority: 'high',
              alert_type: 'quote_completed',
              dashboard_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/quotes`,
              formatted_timestamp: new Date().toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              notification_title: 'Quote Completed',
              action_required: 'Contact customer within 24 hours',
              estimated_revenue: data.quote_price,
              
              // Quote completion properties
              user_name: data.user_name,
              quote_price: data.quote_price,
              glass_type: data.glass_type,
              selected_windows: data.selected_windows,
              customer_priority: 'high',
              
              // Add unique identifiers to prevent email chaining
              unique_event_id: uniqueEventId,
              timestamp_ms: Date.now(),
              event_uuid: `admin-${data.quote_id || data.quoteId}-${Date.now()}`
            },
            metric: {
              data: {
                type: 'metric',
                attributes: {
                  name: 'Admin: Quote Completed'
                }
              }
            },
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: adminEmail,
                  properties: {
                    role: 'admin'
                  }
                }
              }
            },
            time: new Date().toISOString(),
            // Add unique external ID to prevent event deduplication
            unique_id: uniqueEventId
          }
        }
      };

      await KlaviyoService.makeAPICall('/events/', payload);
      console.log('✅ Klaviyo: Admin notification sent');
    } catch (error) {
      console.error('❌ Klaviyo: Failed to send admin notification:', error);
    }
  }

  // Send admin order notification email for completed orders with payment
  static async sendAdminOrderNotification(data: any) {
    try {
      console.log('📧 Sending admin ORDER notification with data:', {
        preferred_date: data.preferred_date || data.appointment_date,
        preferred_time: data.preferred_time || data.appointment_time,
        vehicle_make: data.vehicle_make,
        vehicle_model: data.vehicle_model,
        glass_price: data.glass_price || data.materials_cost,
        fitting_price: data.fitting_price || data.labor_cost,
        payment_method: data.payment_method,
        payment_type: data.payment_type
      });
      
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@windscreencompare.com';
      
      // Generate unique event ID to prevent email chaining for admin notifications
      const uniqueEventId = `admin_order_notification_${data.quote_id || data.order_id}_${Date.now()}`;
      
      const payload = {
        data: {
          type: 'event',
          attributes: {
            properties: {
              // Order Information
              order_id: data.order_id || data.quote_id,
              quote_id: data.quote_id,
              order_date: data.order_date || new Date().toISOString(),
              booking_reference: data.booking_reference,
              
              // Preferred Appointment (these were missing!)
              preferred_date: data.preferred_date || data.appointment_date,
              preferred_time: data.preferred_time || data.appointment_time,
              appointment_type: data.appointment_type,
              
              // Customer Information
              user_name: data.user_name || data.customer_name,
              user_email: data.user_email || data.customer_email,
              user_phone: data.user_phone || data.customer_phone,
              user_location: data.user_location || data.customer_address,
              
              // Vehicle Information (these were missing!)
              vehicle_registration: data.vehicle_registration,
              vehicle_make: data.vehicle_make,
              vehicle_model: data.vehicle_model,
              vehicle_year: data.vehicle_year,
              
              // Service Details
              glass_type: data.glass_type,
              damage_type: data.damage_type || data.selected_windows,
              special_requirements: data.special_requirements || 'None',
              
              // Payment Information (these were missing!)
              glass_price: data.glass_price || data.materials_cost,
              fitting_price: data.fitting_price || data.labor_cost,
              vat_amount: data.vat_amount,
              total_price: data.total_price || data.total_amount,
              payment_status: data.payment_status || 'COMPLETED',
              payment_method: data.payment_method,
              payment_type: data.payment_type,
              stripe_payment_id: data.stripe_payment_id || data.payment_intent_id,
              
              // Admin notification specific properties
              notification_type: 'admin_alert',
              priority: 'high',
              alert_type: 'order_completed',
              dashboard_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/orders`,
              crm_base_url: process.env.CRM_BASE_URL || 'https://your-crm-system.com',
              formatted_timestamp: new Date().toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              notification_title: 'Order Completed',
              action_required: 'Assign technician and confirm appointment',
              source: 'windscreen-compare-website',
              
              // Add unique identifiers to prevent email chaining
              unique_event_id: uniqueEventId,
              timestamp_ms: Date.now(),
              event_uuid: `admin-order-${data.quote_id || data.order_id}-${Date.now()}`
            },
            metric: {
              data: {
                type: 'metric',
                attributes: {
                  name: 'Admin: Quote Completed'
                }
              }
            },
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: adminEmail,
                  properties: {
                    role: 'admin'
                  }
                }
              }
            },
            time: new Date().toISOString(),
            // Add unique external ID to prevent event deduplication
            unique_id: uniqueEventId
          }
        }
      };

      await KlaviyoService.makeAPICall('/events/', payload);
      console.log('✅ Klaviyo: Admin order notification sent');
    } catch (error) {
      console.error('❌ Klaviyo: Failed to send admin order notification:', error);
    }
  }

  // Send payment receipt email to customer
  static async sendPaymentReceipt(data: any) {
    try {
      console.log('📧 Sending payment receipt email via Klaviyo');
      
      // Generate unique event ID to prevent email chaining
      const uniqueEventId = `payment_receipt_${data.quote_id}_${data.payment_intent_id}_${Date.now()}`;
      
      const payload = {
        data: {
          type: 'event',
          attributes: {
            properties: {
              ...data,
              source: 'windscreen-compare-website',
              email_type: 'payment_receipt',
              priority: 'high',
              // Add unique identifiers to prevent email chaining
              unique_event_id: uniqueEventId,
              payment_intent_id: data.payment_intent_id,
              timestamp_ms: Date.now(),
              event_uuid: `receipt-${data.quote_id}-${Date.now()}`
            },
            metric: {
              data: {
                type: 'metric',
                attributes: {
                  name: 'Payment Receipt'
                }
              }
            },
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: data.customer_email,
                  properties: {
                    first_name: data.customer_name?.split(' ')[0] || '',
                    last_name: data.customer_name?.split(' ').slice(1).join(' ') || '',
                    phone_number: data.customer_phone,
                    vehicle_registration: data.vehicle_registration,
                    latest_quote_id: data.quote_id,
                    latest_booking_reference: data.booking_reference
                  }
                }
              }
            },
            time: new Date().toISOString(),
            // Add unique external ID to prevent event deduplication
            unique_id: uniqueEventId
          }
        }
      };

      await KlaviyoService.makeAPICall('/events/', payload);
      console.log('✅ Klaviyo: Payment receipt email sent');
    } catch (error) {
      console.error('❌ Klaviyo: Failed to send payment receipt:', error);
      throw error;
    }
  }

  // Send order confirmation email with service details
  static async sendOrderConfirmation(data: any) {
    try {
      console.log('📧 Sending order confirmation email via Klaviyo');
      
      // Generate unique event ID to prevent email chaining
      const uniqueEventId = `order_confirmation_${data.quote_id}_${data.booking_reference}_${Date.now()}`;
      
      const payload = {
        data: {
          type: 'event',
          attributes: {
            properties: {
              ...data,
              source: 'windscreen-compare-website',
              email_type: 'order_confirmation',
              priority: 'high',
              // Add unique identifiers to prevent email chaining
              unique_event_id: uniqueEventId,
              booking_reference: data.booking_reference,
              timestamp_ms: Date.now(),
              event_uuid: `order-${data.quote_id}-${Date.now()}`
            },
            metric: {
              data: {
                type: 'metric',
                attributes: {
                  name: 'Order Confirmation'
                }
              }
            },
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: data.customer_email,
                  properties: {
                    first_name: data.customer_name?.split(' ')[0] || '',
                    last_name: data.customer_name?.split(' ').slice(1).join(' ') || '',
                    phone_number: data.customer_phone,
                    vehicle_registration: data.vehicle_registration,
                    latest_quote_id: data.quote_id,
                    latest_booking_reference: data.booking_reference,
                    appointment_date: data.appointment_date,
                    appointment_time: data.appointment_time
                  }
                }
              }
            },
            time: new Date().toISOString(),
            // Add unique external ID to prevent event deduplication
            unique_id: uniqueEventId
          }
        }
      };

      await KlaviyoService.makeAPICall('/events/', payload);
      console.log('✅ Klaviyo: Order confirmation email sent');
    } catch (error) {
      console.error('❌ Klaviyo: Failed to send order confirmation:', error);
      throw error;
    }
  }

  // Helper method to make API calls
  private static async makeAPICall(endpoint: string, payload: any) {
    if (!KlaviyoService.PRIVATE_KEY) {
      console.warn('⚠️ Klaviyo: Private API key not configured');
      return;
    }

    console.log('📤 Making Klaviyo API call to:', endpoint);
    console.log('📋 Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${KlaviyoService.API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${KlaviyoService.PRIVATE_KEY}`,
        'Content-Type': 'application/json',
        'revision': '2024-10-15'
      },
      body: JSON.stringify(payload)
    });

    console.log('📡 Klaviyo response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Klaviyo API error response:', errorText);
      throw new Error(`Klaviyo API error: ${response.status} - ${errorText}`);
    }

    // Handle empty responses (common for successful events)
    const responseText = await response.text();
    console.log('📄 Klaviyo response text:', responseText);
    
    if (!responseText || responseText.trim() === '') {
      console.log('✅ Empty response from Klaviyo (likely successful)');
      return {};
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.warn('⚠️ Failed to parse Klaviyo response as JSON:', responseText);
      return {};
    }
  }
}

export default KlaviyoService; 