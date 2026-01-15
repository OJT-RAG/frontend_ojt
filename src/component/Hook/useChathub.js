import { useEffect } from "react";
import chatHubService from "../../signalr/chatHub";

export default function useChatHub(userId, onMessage) {
  useEffect(() => {
    if (!userId) return;

    chatHubService.connect(userId);
    chatHubService.subscribe(onMessage);

    return () => {
      chatHubService.unsubscribe(onMessage);
    };
  }, [userId]);
}
