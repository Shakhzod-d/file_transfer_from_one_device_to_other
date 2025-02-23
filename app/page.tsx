"use client";

import { useState, useRef, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import SimplePeer from "simple-peer";

export default function Home() {
  const [peer, setPeer] = useState<SimplePeer.Instance | null>(null);
  const [offer, setOffer] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const scannedOffer = urlParams.get("offer");
    if (scannedOffer) {
      setOffer(scannedOffer);
      acceptOffer(scannedOffer);
    }
  }, []);

  const createOffer = () => {
    localStorage.setItem("p2p_offer", ""); // Clear previous offers
    const p = new SimplePeer({ initiator: true, trickle: false });
    p.on("signal", (data) => {
      const offerString = JSON.stringify(data);
      setOffer(offerString);
      localStorage.setItem("p2p_offer", offerString);
    });
    p.on("connect", () => console.log("Connected!"));
    p.on("data", (data) => {
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "received_file";
      link.click();
    });
    setPeer(p);
  };

  const acceptOffer = (incomingOffer?: string) => {
    const offerToUse = incomingOffer || localStorage.getItem("p2p_offer");
    if (!offerToUse) return;

    const p = new SimplePeer({ initiator: false, trickle: false });
    p.signal(JSON.parse(offerToUse));
    p.on("signal", (data) => {
      const answerString = JSON.stringify(data);
      setAnswer(answerString);
      localStorage.setItem("p2p_answer", answerString);
    });
    p.on("connect", () => console.log("Connected!"));
    setPeer(p);
  };

  const sendFile = () => {
    if (!peer || !fileInputRef.current?.files?.[0]) return;
    const file = fileInputRef.current.files[0];
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => {
      if (reader.result) {
        peer.send(reader.result as ArrayBuffer);
      }
    };
  };

  useEffect(() => {
    const checkForAnswers = setInterval(() => {
      const storedAnswer = localStorage.getItem("p2p_answer");
      if (storedAnswer && peer) {
        peer.signal(JSON.parse(storedAnswer));
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(checkForAnswers);
  }, [peer]);

  return (
    <div className="flex flex-col items-center justify-center h-screen p-5 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">P2P File Transfer</h1>
      <ConnectionControls
        offer={offer}
        answer={answer}
        setAnswer={setAnswer}
        createOffer={createOffer}
        acceptOffer={() => acceptOffer()}
        peer={peer}
      />
      <QRCodeDisplay
        offer={`https://file-transfer-from-one-device-to-other.vercel.app/?offer=${offer}`}
      />
      <FileInput fileInputRef={fileInputRef} sendFile={sendFile} />
    </div>
  );
}

interface FileInputProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  sendFile: () => void;
}

const FileInput: React.FC<FileInputProps> = ({ fileInputRef, sendFile }) => {
  return (
    <div className="mt-4">
      <input ref={fileInputRef} type="file" className="border p-2" />
      <button
        onClick={sendFile}
        className="p-2 bg-purple-500 text-white rounded-lg mt-2"
      >
        Send File
      </button>
    </div>
  );
};

interface QRCodeDisplayProps {
  offer: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ offer }) => {
  return offer ? <QRCodeCanvas value={offer} className="mt-4" /> : null;
};

interface ConnectionControlsProps {
  offer: string;
  answer: string;
  setAnswer: (value: string) => void;
  createOffer: () => void;
  acceptOffer: () => void;
  peer: SimplePeer.Instance | null;
}

const ConnectionControls: React.FC<ConnectionControlsProps> = ({
  answer,
  setAnswer,
  createOffer,
  peer,
}) => {
  return (
    <div>
      <button
        onClick={createOffer}
        className="p-2 bg-blue-500 text-white rounded-lg"
      >
        Create Offer
      </button>
      <input
        type="text"
        placeholder="Paste Answer Here"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        className="border p-2 mt-2"
      />
      <button
        onClick={() => peer?.signal(JSON.parse(answer))}
        className="p-2 bg-green-500 text-white rounded-lg mt-2"
      >
        Connect
      </button>
    </div>
  );
};
