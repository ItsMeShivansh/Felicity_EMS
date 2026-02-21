const QRCode = require('qrcode');

/**
 * Generate a unique ticket ID
 * Format: TKT-YYYY-XXXXXX (e.g., TKT-2026-A3F9D2)
 */
const generateTicketId = () => {
  const year = new Date().getFullYear();
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TKT-${year}-${randomString}`;
};

/**
 * Generate QR code as base64 data URL
 * @param {object} data - Data to encode in QR code
 * @returns {Promise<string>} - Base64 encoded QR code image
 */
const generateQRCode = async (data) => {
  try {
    // Convert data to JSON string
    const jsonData = JSON.stringify(data);
    
    // Generate QR code as base64 data URL
    const qrCodeDataURL = await QRCode.toDataURL(jsonData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate ticket data and QR code for an event registration
 * @param {string} ticketId - Unique ticket ID
 * @param {string} eventId - Event ID
 * @param {string} participantId - Participant ID
 * @param {string} eventName - Event name
 * @param {string} participantName - Participant name
 * @returns {Promise<object>} - Ticket data with QR code
 */
const generateTicket = async (ticketId, eventId, participantId, eventName, participantName) => {
  try {
    // Data to encode in QR code
    const qrData = {
      ticketId,
      eventId,
      participantId,
      eventName,
      participantName,
      timestamp: new Date().toISOString()
    };
    
    // Generate QR code
    const qrCode = await generateQRCode(qrData);
    
    return {
      ticketId,
      qrCode,
      qrData
    };
  } catch (error) {
    console.error('Error generating ticket:', error);
    throw new Error('Failed to generate ticket');
  }
};

module.exports = {
  generateTicketId,
  generateQRCode,
  generateTicket
};
