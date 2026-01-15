import * as signalR from "@microsoft/signalr";

class ChatHubService {
  connection = null;
  listeners = [];

  async connect(userId) {
    if (this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(
        `http://localhost:7031/chatHub?userId=${userId}`
      )
      .withAutomaticReconnect()
      .build();

    this.connection.on("ReceiveMessage", (message) => {
      this.listeners.forEach((cb) => cb(message));
    });

    try {
      await this.connection.start();
      console.log("✅ SignalR connected");
    } catch (err) {
      console.error("❌ SignalR connect failed", err);
    }
  }

  disconnect() {
    if (this.connection) {
      this.connection.stop();
      this.connection = null;
      this.listeners = [];
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  unsubscribe(callback) {
    this.listeners = this.listeners.filter(
      (cb) => cb !== callback
    );
  }
}

const chatHubService = new ChatHubService();
export default chatHubService;
