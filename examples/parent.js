const T = require('tman-wrtc')
const S = require('spray-wrtc')

let graphTMAN = new window.P2PGraph('#tman')
let graphParent = new window.P2PGraph('#parent')

let N = 5

// #1 create N peers
let peers = []
let revertedIndex = new Map()
for (let i = 0; i < N; ++i) {
  // #A initialize the RPS that will serve as parent for t-man
  let parent = new S({peer: i,
    delta: 1 * 1000,
    config: {trickle: true}})
  // #B initialize the t-man process
  peers.push(new T({ delta: 1000, descriptor: {x: i}}, parent))
  // #C create a reverted index for convenience's sake
  revertedIndex.set(peers[i].NI.PEER, peers[i])
};

// #2 simulate signaling server
const callback = (from, to) => {
  return (offer) => {
    to.connect((answer) => { from.connect(answer) }, offer)
  }
}

// #3 peers join the network 1 by 1
for (let i = 1; i < N; ++i) {
  setTimeout((nth) => {
    const rn = Math.floor(Math.random() * nth)
    //        peers[nth].join(callback(peers[nth], peers[rn]));
    peers[nth].parent.join(callback(peers[nth].parent, peers[rn].parent))
    peers[nth]._start()
  }, i * 1000, i)
};

var totalLinks = 0
var totalLinksParent = 0

for (let i = 0; i < N; ++i) {
  graphTMAN.add({
    id: peers[i].PEER,
    me: false,
    name: i
  })
  graphParent.add({
    id: peers[i].PEER,
    me: false,
    name: i
  })

  peers[i].on('open', (peerId) => {
    !graphTMAN.hasLink(peers[i].PEER, revertedIndex.get(peerId).PEER) &&
            graphTMAN.connect(peers[i].PEER, revertedIndex.get(peerId).PEER)
    totalLinks += 1
  })
  peers[i].on('close', (peerId) => {
    (!peers[i].o.has(peerId)) &&
            graphTMAN.disconnect(peers[i].PEER, revertedIndex.get(peerId).PEER)
    totalLinks -= 1
  })

  peers[i].parent.on('open', (peerId) => {
    !graphParent.hasLink(peers[i].PEER, revertedIndex.get(peerId).PEER) &&
            graphParent.connect(peers[i].PEER, revertedIndex.get(peerId).PEER)
    totalLinksParent += 1
  })
  peers[i].parent.on('close', (peerId) => {
    (!peers[i].parent.o.has(peerId)) &&
            graphParent.disconnect(peers[i].PEER,
              revertedIndex.get(peerId).PEER)
    totalLinksParent -= 1
  })
};

let scramble = (delay = 0) => {
  for (let i = 0; i < N; ++i) {
    setTimeout((nth) => {
      peers[nth]._exchange() // force exchange
    }, i * delay, i)
  };
}

var cloud = () => {
  let result = []
  for (let i = 0; i < N; ++i) {
    peers[i].getPeers().forEach((neighbor) => {
      let d = Math.abs(peers[i].options.descriptor.x -
                     revertedIndex.get(neighbor).options.descriptor.x) / N
      result.push(d)
    })
  };
  return result.sort((a, b) => a - b)
}
