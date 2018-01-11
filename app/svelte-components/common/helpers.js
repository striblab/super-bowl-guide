/**
 * Common/share helpers for Svelte components
 *
 * Note that computed methods can't be variables and have to be
 * defined in the component, but we want to share some, so
 * we make them helpers.
 */

let helpers = {};

// Create image srcset.
helpers.srcset = function(basePath, imagePath, extension) {
  let p = basePath + '/' + imagePath;

  return ['300', '600', '900', '1200', '2000']
    .map(w => {
      return `${p
        .replace(/\.([a-z]+$)/i, '-' + w + 'px.$1')
        .replace(/\.([a-z]+$)/i, extension ? '.' + extension : '.$1')} ${w}w`;
    })
    .join(', ');
};

// Escape HTML, specifically for fields where we sometimes want HTML {{{ }}}
// and sometimes don't.
helpers.escapeHTML = function(input) {
  return input ? input.replace(/(<([^>]+)>)/gi, '') : '';
};

// Does data have a full byline or not
helpers.fullByline = function(data) {
  return data && data.byline && ~data.byline.indexOf('•');
};

// URL for directions via Google or Apple on iOS.  TODO: Is there a way to specify
// the position and a name?
// https://developers.google.com/maps/documentation/urls/guide#directions-action
helpers.directionsURL = function(data, store) {
  // Simple way of determining ios
  let ios =
    typeof window !== 'undefined' &&
    navigator &&
    navigator.platform &&
    navigator.platform.match &&
    navigator.platform.match(/iphone|ipad/i)
      ? true
      : false;
  let location =
    store && store.location && store.location.position
      ? store.location.position.lat + ',' + store.location.position.lng
      : undefined;

  return ios
    ? `https://maps.apple.com/?api=x${
      location ? '&saddr=' + encodeURIComponent(location) : ''
    }&daddr=${encodeURIComponent(data.latitude)},${encodeURIComponent(
      data.longitude
    )}`
    : `https://www.google.com/maps/dir/?api=1${
      location ? '&origin=' + encodeURIComponent(location) : ''
    }&destination=${encodeURIComponent(data.latitude)},${encodeURIComponent(
      data.longitude
    )}`;
};

// URL for facebook link
helpers.facebookURL = function(data) {
  if (!data) {
    return '';
  }

  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    data.baseURL
  )}`;
};

// URL for twitter link
helpers.twitterURL = function(data, content) {
  if (!data && !content) {
    return '';
  }

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    data.twitterShare || content.twitterShare
  )}&url=${encodeURIComponent(data.baseURL)}&via=${encodeURIComponent(
    content.twitterAccount
  )}`;
};

// URL for email link
helpers.emailURL = function(data, content) {
  if (!data && !content) {
    return '';
  }

  return `mailto:RECIPIENT?subject=${encodeURIComponent(
    data.emailShare || content.emailShare
  )}&body=${encodeURIComponent(data.baseURL)}`;
};

helpers.phoneURL = function(phone) {
  return phone ? `tel:${phone.replace(/[^0-9]+/g, '')}` : '';
};

helpers.urlLink = function(url) {
  return url ? (url.match(/^http/i) ? url : `http://${url}`) : '';
};

helpers.urlText = function(url) {
  return url
    ? url
      .replace(/^https?:\/\//i, '')
      .replace(/www\./i, '')
      .replace(/\/$/, '')
    : '';
};

// Parse a date
helpers.parseDate = function(input) {
  // Assume YYYY-MM-DD
  if (typeof input === 'string') {
    return new Date(
      parseInt(input.split('-')[0], 10),
      parseInt(input.split('-')[1], 10) - 1,
      parseInt(input.split('-')[2], 10)
    );
  }
  else if (input && typeof input.getMonth === 'function') {
    return input;
  }
};

// Format date
helpers.formatDate = function(date, format = 'Month Date, Year') {
  let monthLong = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  let monthShort = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'June',
    'July',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec'
  ];

  let d = helpers.parseDate(date);
  if (!d) {
    return '';
  }

  return format
    .replace(/ISO/g, d.toString())
    .replace(/Year/g, d.getFullYear())
    .replace(/Month|MonthShort/g, monthShort[d.getMonth()])
    .replace(/MonthLong/g, monthLong[d.getMonth()])
    .replace(/Date/g, d.getDate());
};

// Is a date past
helpers.datePast = function(date) {
  let d = helpers.parseDate(date);
  if (!d) {
    return false;
  }

  let now = new Date();

  // If now is greater and not the same day
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
    ? false
    : now.getTime() > d.getTime();
};

module.exports = helpers;
