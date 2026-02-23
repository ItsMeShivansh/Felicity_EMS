// Calendar Export Utility for generating .ics files and calendar links

const formatDate = (date) => {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const escapeICS = (text) => {
  if (!text) return '';
  return text.replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

// Generate .ics file content for a single event
const generateICS = (event, registration) => {
  const startDate = formatDate(event.startDate);
  const endDate = formatDate(event.endDate);
  const created = formatDate(registration.registrationDate);
  const uid = `${registration.ticketId}@felicity-events.com`;

  const location = escapeICS(event.location || event.venue || 'TBA');
  const description = escapeICS(
    `Event: ${event.name}\n` +
    `Ticket ID: ${registration.ticketId}\n` +
    `Status: ${registration.status}\n` +
    `${event.description || ''}`
  );

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Felicity Events//Event Management//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${created}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${escapeICS(event.name)}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event reminder: Tomorrow',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event starting in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
};

// Generate .ics file for multiple events
const generateBatchICS = (registrations) => {
  const events = registrations.map(reg => {
    const event = reg.event;
    const startDate = formatDate(event.startDate);
    const endDate = formatDate(event.endDate);
    const created = formatDate(reg.registrationDate);
    const uid = `${reg.ticketId}@felicity-events.com`;

    const location = escapeICS(event.location || event.venue || 'TBA');
    const description = escapeICS(
      `Event: ${event.name}\n` +
      `Ticket ID: ${reg.ticketId}\n` +
      `Status: ${reg.status}\n` +
      `${event.description || ''}`
    );

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${created}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${escapeICS(event.name)}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Event reminder: Tomorrow',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Event starting in 1 hour',
      'END:VALARM',
      'END:VEVENT'
    ].join('\r\n');
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Felicity Events//Event Management//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
};

// Generate Google Calendar link
const generateGoogleCalendarLink = (event, registration) => {
  const startDate = formatDate(event.startDate);
  const endDate = formatDate(event.endDate);
  const title = encodeURIComponent(event.name);
  const details = encodeURIComponent(
    `Ticket ID: ${registration.ticketId}\n${event.description || ''}`
  );
  const location = encodeURIComponent(event.location || event.venue || 'TBA');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
};

// Generate Outlook calendar link
const generateOutlookLink = (event, registration) => {
  const startDate = new Date(event.startDate).toISOString();
  const endDate = new Date(event.endDate).toISOString();
  const title = encodeURIComponent(event.name);
  const body = encodeURIComponent(
    `Ticket ID: ${registration.ticketId}\n${event.description || ''}`
  );
  const location = encodeURIComponent(event.location || event.venue || 'TBA');

  return `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${title}&startdt=${startDate}&enddt=${endDate}&body=${body}&location=${location}`;
};

module.exports = {
  generateICS,
  generateBatchICS,
  generateGoogleCalendarLink,
  generateOutlookLink
};
