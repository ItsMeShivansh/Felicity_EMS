const brevo = require('@getbrevo/brevo');

// Initialize Brevo API client
const getBrevoClient = () => {
  if (!process.env.BREVO_API_KEY) {
    console.warn('⚠️  Brevo API key not configured. Emails will be logged instead of sent.');
    console.warn('   Required env variable: BREVO_API_KEY');
    console.warn('   Get your API key from: https://app.brevo.com/settings/keys/api');
    return null;
  }

  const apiInstance = new brevo.TransactionalEmailsApi();
  const apiKey = apiInstance.authentications['apiKey'];
  apiKey.apiKey = process.env.BREVO_API_KEY;
  
  return apiInstance;
};

const sendTicketEmail = async (options) => {
  try {
    const apiInstance = getBrevoClient();
    
    if (!apiInstance) {
      // Log email details in development
      console.log('📧 EMAIL (Development Mode):');
      console.log('To:', options.to);
      console.log('Subject:', `Your ticket for ${options.eventName}`);
      console.log('Ticket ID:', options.ticketId);
      console.log('Event:', options.eventName);
      console.log('-----------------------------------');
      return { success: true, message: 'Email logged (development mode)' };
    }

    const eventDate = new Date(options.eventDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Build merchandise items HTML if applicable
    let merchandiseHTML = '';
    if (options.isMerchandise && options.items) {
      merchandiseHTML = `
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">Items Purchased:</h3>
          <ul style="list-style: none; padding: 0;">
            ${options.items.map(item => `
              <li style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                <strong>${item.itemName}</strong> - 
                Quantity: ${item.quantity} - 
                Price: ₹${item.price * item.quantity}
              </li>
            `).join('')}
          </ul>
          <p style="font-size: 18px; font-weight: bold; color: #28a745; margin-top: 15px;">
            Total Amount: ₹${options.totalAmount}
          </p>
        </div>
      `;
    }

    // Email HTML template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Registration Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 ${options.isMerchandise ? 'Purchase' : 'Registration'} Confirmed!</h1>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 30px 40px;">
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                      Hi <strong>${options.participantName}</strong>,
                    </p>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                      Your ${options.isMerchandise ? 'purchase' : 'registration'} for <strong>${options.eventName}</strong> has been confirmed!
                    </p>
                    
                    ${merchandiseHTML}
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <h3 style="color: #333; margin-top: 0;">Event Details</h3>
                      <p style="margin: 8px 0; color: #555;">
                        <strong>📅 Date:</strong> ${eventDate}
                      </p>
                      <p style="margin: 8px 0; color: #555;">
                        <strong>📍 Location:</strong> ${options.eventLocation || 'TBA'}
                      </p>
                      <p style="margin: 8px 0; color: #555;">
                        <strong>🎫 Ticket ID:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px;">${options.ticketId}</code>
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <h3 style="color: #333; margin-bottom: 15px;">Your Ticket QR Code</h3>
                      <img src="${options.qrCode}" alt="QR Code" style="width: 250px; height: 250px; border: 2px solid #dee2e6; border-radius: 8px; padding: 10px; background-color: #fff;">
                      <p style="font-size: 14px; color: #666; margin-top: 15px;">
                        Please present this QR code at the event entry
                      </p>
                    </div>
                    
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                      <p style="margin: 0; color: #856404; font-size: 14px;">
                        <strong>⚠️ Important:</strong> Save this email or take a screenshot of the QR code. You'll need it for event entry.
                      </p>
                    </div>
                    
                    <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 30px;">
                      We look forward to seeing you at the event!
                    </p>
                    
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                      Best regards,<br>
                      <strong>Felicity Team</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 20px 40px; text-align: center; border-top: 1px solid #dee2e6;">
                    <p style="font-size: 12px; color: #6c757d; margin: 0;">
                      This is an automated email. Please do not reply to this message.
                    </p>
                    <p style="font-size: 12px; color: #6c757d; margin: 10px 0 0 0;">
                      © ${new Date().getFullYear()} Felicity Event Management System. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Prepare QR code attachment
    const qrCodeContent = options.qrCode.split('base64,')[1];

    // Create Brevo email object
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.sender = {
      name: 'Felicity Events',
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@felicity.iiit.ac.in'
    };
    
    sendSmtpEmail.to = [
      {
        email: options.to,
        name: options.participantName
      }
    ];
    
    sendSmtpEmail.subject = `🎫 Your ticket for ${options.eventName}`;
    sendSmtpEmail.htmlContent = htmlContent;
    
    sendSmtpEmail.attachment = [
      {
        name: `ticket-${options.ticketId}.png`,
        content: qrCodeContent
      }
    ];

    // Send email via Brevo API
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('✅ Email sent successfully via Brevo:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Error sending email via Brevo:', error);
    // Don't throw error - registration should succeed even if email fails
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendTicketEmail
};
