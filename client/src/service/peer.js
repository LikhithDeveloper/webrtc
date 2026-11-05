const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.relay.metered.ca:80" },
  {
    urls: "turn:global.relay.metered.ca:80",
    username: "decc848ba2ba5481911ee004",
    credential: "OU/Kdw2LhMHckv5E",
  },
  {
    urls: "turn:global.relay.metered.ca:80?transport=tcp",
    username: "decc848ba2ba5481911ee004",
    credential: "OU/Kdw2LhMHckv5E",
  },
  {
    urls: "turn:global.relay.metered.ca:443",
    username: "decc848ba2ba5481911ee004",
    credential: "OU/Kdw2LhMHckv5E",
  },
  {
    urls: "turns:global.relay.metered.ca:443?transport=tcp",
    username: "decc848ba2ba5481911ee004",
    credential: "OU/Kdw2LhMHckv5E",
  },
];

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
