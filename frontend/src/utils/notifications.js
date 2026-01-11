export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Bu tarayıcı bildirimleri desteklemiyor');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const showNotification = (title, options = {}) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/logo192.png',
      badge: '/logo192.png',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }
};

export const notifyNewMessage = (sender, message) => {
  if (document.hidden) {
    showNotification(`💬 ${sender}`, {
      body: message.length > 50 ? message.substring(0, 50) + '...' : message,
      tag: 'new-message',
    });
  }
};

export const notifyIncomingCall = (caller, callType) => {
  showNotification(`📞 Gelen ${callType === 'video' ? 'Görüntülü' : 'Sesli'} Arama`, {
    body: `${caller} sizi arıyor...`,
    tag: 'incoming-call',
    requireInteraction: true,
  });
};
