import { useEffect } from "react";
import chatHubService from "../../signalr/chatHub";

export default function useChatHub(userId, onMessage) {
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const start = async () => {
      await chatHubService.connect(userId);

      if (!isMounted) return;

      chatHubService.subscribe(onMessage);
    };

    start();

    return () => {
      isMounted = false;
      chatHubService.unsubscribe(onMessage);
      chatHubService.disconnect?.(); // 👈 nếu có
    };
  }, [userId, onMessage]);
}
