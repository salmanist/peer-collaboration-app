import { PeerRideChatScreen, type ChatSource } from "../../ondemand/presentation/PeerRideChatScreen";
import { fetchRideChatMessages, sendRideChatMessage } from "../data/ridesApi";

const CARPOOL_SOURCE: ChatSource = {
  fetchMessages: fetchRideChatMessages,
  sendMessage: sendRideChatMessage,
  socketPath: (id) => `/ws/rides/requests/${id}/chat/`,
};

// Live chat between the driver and one accepted rider of a scheduled carpool.
export function RideChatScreen() {
  return <PeerRideChatScreen source={CARPOOL_SOURCE} />;
}
