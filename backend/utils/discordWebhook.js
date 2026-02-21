const axios = require('axios');

/**
 * Sends a formatted message to Discord webhook when a new event is published
 * @param {string} webhookUrl - Discord webhook URL
 * @param {object} event - Event object to be posted
 * @param {object} organizer - Organizer object
 */
const sendEventToDiscord = async (webhookUrl, event, organizer) => {
  if (!webhookUrl || webhookUrl.trim() === '') {
    return; // No webhook configured, skip
  }

  try {
    // Format dates
    const startDate = new Date(event.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const endDate = new Date(event.endDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const registrationDeadline = new Date(event.registrationDeadline).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create Discord embed message
    const embed = {
      title: `🎉 New Event: ${event.name}`,
      description: event.description,
      color: 5814783, // Blue color
      fields: [
        {
          name: '📅 Event Type',
          value: event.eventType,
          inline: true
        },
        {
          name: '📍 Location',
          value: event.location || 'TBA',
          inline: true
        },
        {
          name: '💰 Entry Fee',
          value: event.entryFee > 0 ? `₹${event.entryFee}` : 'Free',
          inline: true
        },
        {
          name: '🎯 Eligibility',
          value: event.eligibility || 'Open to all',
          inline: false
        },
        {
          name: '🕐 Start Date',
          value: startDate,
          inline: false
        },
        {
          name: '🕑 End Date',
          value: endDate,
          inline: false
        },
        {
          name: '⏰ Registration Deadline',
          value: registrationDeadline,
          inline: false
        },
        {
          name: '👥 Registration Limit',
          value: event.registrationLimit > 0 ? `${event.registrationLimit} participants` : 'No limit',
          inline: true
        }
      ],
      footer: {
        text: `Organized by ${organizer.name} | ${organizer.category}`
      },
      timestamp: new Date().toISOString()
    };

    // Add tags if available
    if (event.tags && event.tags.length > 0) {
      embed.fields.push({
        name: '🏷️ Tags',
        value: event.tags.join(', '),
        inline: false
      });
    }

    // Send to Discord
    await axios.post(webhookUrl, {
      username: 'Event Management System',
      embeds: [embed]
    });

    console.log(`✅ Event "${event.name}" posted to Discord successfully`);
  } catch (error) {
    // Log error but don't fail the event creation
    console.error('❌ Failed to send event to Discord:', error.message);
    if (error.response) {
      console.error('Discord API Response:', error.response.data);
    }
  }
};

module.exports = { sendEventToDiscord };
