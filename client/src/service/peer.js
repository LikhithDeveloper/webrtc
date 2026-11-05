// TURN is only enabled when configured (build-time env vars), e.g. a free
// Metered account:
//   REACT_APP_TURN_URLS="turn:a.relay.metered.ca:80,turns:a.relay.metered.ca:443?transport=tcp"
//   REACT_APP_TURN_USERNAME, REACT_APP_TURN_CREDENTIAL
const ICE_SERVERS = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:global.stun.twilio.com:3478",
    ],
  },
];

if (process.env.REACT_APP_TURN_URLS) {
  ICE_SERVERS.push({
    urls: process.env.REACT_APP_TURN_URLS.split(",").map((u) => u.trim()),
    username: process.env.REACT_APP_TURN_USERNAME,
    credential: process.env.REACT_APP_TURN_CREDENTIAL,
  });
}

class PeerService {
  constructor() {
    this.pending = [];
    if (!this.peer) {
      this.peer = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });
    }
  }

  // ICE candidates can arrive before the remote description is set; queue them
  async addCandidate(candidate) {
    if (!candidate || !this.peer) return;
    if (this.peer.remoteDescription) {
      try {
        await this.peer.addIceCandidate(candidate);
      } catch (e) {
        console.warn("addIceCandidate failed", e);
      }
    } else {
      this.pending.push(candidate);
    }
  }

  async flushCandidates() {
    while (this.pending.length) {
      await this.addCandidate(this.pending.shift());
    }
  }

  async getAnswer(offer) {
    if (this.peer) {
      await this.peer.setRemoteDescription(offer);
      await this.flushCandidates();
      const ans = await this.peer.createAnswer();
      await this.peer.setLocalDescription(new RTCSessionDescription(ans));
      return ans;
    }
  }

  async setLocalDescription(ans) {
    if (this.peer) {
      await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
      await this.flushCandidates();
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
