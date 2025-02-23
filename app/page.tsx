"use client";

import { useState, useRef, useEffect } from "react";
// import { QRCodeCanvas } from "qrcode.react";
import SimplePeer from "simple-peer";

export default function Home() {
  const [peer, setPeer] = useState<SimplePeer.Instance | null>(null);
  const [offer, setOffer] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createOffer = () => {
    const p = new SimplePeer({ initiator: true, trickle: false });

    p.on("signal", (data) => {
      const offerString = JSON.stringify(data);
      setOffer(offerString);
    });

    p.on("connect", () => console.log("✅ Connected!"));
    p.on("data", (data) => receiveFile(data));

    setPeer(p);
  };

  const acceptOffer = (incomingOffer: string) => {
    const p = new SimplePeer({ initiator: false, trickle: false });

    p.signal(JSON.parse(incomingOffer));
    p.on("signal", (data) => {
      const answerString = JSON.stringify(data);
      window.location.href = `${window.location.origin}?answer=${answerString}`;
    });

    p.on("connect", () => console.log("✅ Connected!"));
    p.on("data", (data) => receiveFile(data));

    setPeer(p);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const scannedOffer = urlParams.get("offer");
      if (scannedOffer) {
        acceptOffer(scannedOffer);
      }
    }
  }, [acceptOffer]);

  const receiveFile = (data: Uint8Array) => {
    const blob = new Blob([data]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "received_file";
    link.click();
  };

  const sendFile = () => {
    if (!peer || !peer.connected || !fileInputRef.current?.files?.[0]) {
      console.error("Connection not open or file missing!");
      return;
    }

    const file = fileInputRef.current.files[0];
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => {
      if (reader.result) {
        peer.send(reader.result as ArrayBuffer);
        console.log("📤 File sent successfully!");
      }
    };
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen p-5 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">P2P File Transfer</h1>
      <ConnectionControls
        offer={offer}
        // answer={answer}
        // setAnswer={setAnswer}
        createOffer={createOffer}
        // acceptOffer={() => acceptOffer()}
        peer={peer}
      />

      {/* <QRCodeDisplay offer={`${window.location.origin}?offer=${offer}`} /> */}
      {typeof window !== "undefined" && (
        <QRCodeDisplay offer={`${window.location.origin}?offer=${offer}`} />
      )}

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
  return (
    <QRCodeDisplay
      offer={
        typeof window !== "undefined"
          ? `${window.location.origin}?offer=${offer}`
          : ""
      }
    />
  );
};

interface ConnectionControlsProps {
  offer: string;
  answer?: string;
  setAnswer?: (value: string) => void;
  createOffer: () => void;
  acceptOffer?: () => void;
  peer: SimplePeer.Instance | null;
}

const ConnectionControls: React.FC<ConnectionControlsProps> = ({
  answer,
  createOffer,
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
        // onChange={(e) => setAnswer(e.target.value)}
        className="border p-2 mt-2"
      />
      {/* <button
        onClick={() => peer?.signal(JSON.parse(answer))}
        className="p-2 bg-green-500 text-white rounded-lg mt-2"
      >
        Connect
      </button> */}
    </div>
  );
};
