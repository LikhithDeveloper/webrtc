// TURN relay for peers behind strict NATs / on different networks.
// Override with env vars at build time (e.g. your own free Metered account):
//   REACT_APP_TURN_URLS="turn:a.relay.metered.ca:80,turn:a.relay.metered.ca:443,turns:a.relay.metered.ca:443?transport=tcp"
//   REACT_APP_TURN_USERNAME, REACT_APP_TURN_CREDENTIAL
// Default: Open Relay public free servers (shared, best-effort).
const turnUrls = process.env.REACT_APP_TURN_URLS
  ? process.env.REACT_APP_TURN_URLS.split(",").map((u) => u.trim())
  : [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turns:openrelay.metered.ca:443?transport=tcp",
    ];

const ICE_SERVERS = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:global.stun.twilio.com:3478",
    ],
  },
  {
    urls: turnUrls,
    username: process.env.REACT_APP_TURN_USERNAME || "openrelayproject",
    credential: process.env.REACT_APP_TURN_CREDENTIAL || "openrelayproject",
  },
];

class PeerService {
  constructor() {
    if (!this.peer) {
      this.peer = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });
    }
  }

  async getAnswer(offer) {
    if (this.peer) {
      await this.peer.setRemoteDescription(offer);
      const ans = await this.peer.createAnswer();
      await this.peer.setLocalDescription(new RTCSessionDescription(ans));
      return ans;
    }
  }

  async setLocalDescription(ans) {
    if (this.peer) {
      await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
    }
  }

  async getOffer() {
    if (this.peer) {
      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(new RTCSessionDescription(offer));
      return offer;
    }
  }
}

export default new PeerService();
