/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB9nYHNJVHcHczXfGOqX1JUYxUVXmyEr7E",
  authDomain: "mylen-24263782-5d205.firebaseapp.com",
  projectId: "mylen-24263782-5d205",
  storageBucket: "mylen-24263782-5d205.firebasestorage.app",
  messagingSenderId: "811979249105",
  appId: "1:811979249105:web:6b7f47325840de7850fcf0",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || "SimplyStock", {
    body: body || "",
    icon: icon || "/favicon.ico",
    tag: "simplystock-signal",
    data: { url: payload.data?.url || "https://www.simplystock.co.kr/" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "https://www.simplystock.co.kr/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("simplystock") && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
