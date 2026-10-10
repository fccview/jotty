import {
  RobotAntennas,
  RobotEyes,
  RobotHeads,
  RobotLook,
  RobotMouths,
} from "@/app/_utils/agent-avatar-utils";

interface PartProps {
  look: RobotLook;
}

export const RobotAntenna = ({ look }: PartProps) => {
  const stroke = { stroke: look.body, strokeWidth: 1.4, strokeLinecap: "round" as const };

  switch (look.antenna) {
    case RobotAntennas.BULB:
      return (
        <>
          <line x1="12" y1="3" x2="12" y2="6.5" {...stroke} />
          <circle cx="12" cy="2.4" r="1.6" fill={look.accent} />
        </>
      );
    case RobotAntennas.TWIN:
      return (
        <>
          <line x1="8.5" y1="6.5" x2="6.5" y2="2.5" {...stroke} />
          <line x1="15.5" y1="6.5" x2="17.5" y2="2.5" {...stroke} />
          <circle cx="6.5" cy="2.3" r="1.1" fill={look.accent} />
          <circle cx="17.5" cy="2.3" r="1.1" fill={look.accent} />
        </>
      );
    case RobotAntennas.BOLT:
      return <polyline points="12,6.5 10.5,4.5 13.5,3.5 12,1" fill="none" {...stroke} stroke={look.accent} />;
    case RobotAntennas.DISH:
      return (
        <>
          <line x1="12" y1="4" x2="12" y2="6.5" {...stroke} />
          <path d="M8.5 3.5 Q12 6 15.5 3.5" fill="none" {...stroke} stroke={look.accent} />
        </>
      );
    default:
      return null;
  }
};

export const RobotHead = ({ look }: PartProps) => {
  const paint = { fill: look.body };

  switch (look.head) {
    case RobotHeads.ROUNDED:
      return <rect x="4" y="6" width="16" height="15" rx="6" {...paint} />;
    case RobotHeads.TALL:
      return <rect x="6" y="5.5" width="12" height="16" rx="3" {...paint} />;
    case RobotHeads.WIDE:
      return <rect x="2.5" y="7.5" width="19" height="13" rx="3" {...paint} />;
    case RobotHeads.HEX:
      return <polygon points="12,5 20.5,9 20.5,17.5 12,21.5 3.5,17.5 3.5,9" {...paint} />;
    case RobotHeads.DOME:
      return <path d="M4 20.5 V13 A8 8 0 0 1 20 13 V20.5 Z" {...paint} />;
    default:
      return <rect x="4" y="6.5" width="16" height="14.5" rx="2" {...paint} />;
  }
};

export const RobotEyesPart = ({ look }: PartProps) => {
  const glow = { fill: look.accent };

  switch (look.eyes) {
    case RobotEyes.VISOR:
      return <rect x="8" y="11" width="8" height="2.6" rx="1.3" {...glow} />;
    case RobotEyes.SQUARES:
      return (
        <>
          <rect x="8.6" y="11.2" width="2.2" height="2.2" {...glow} />
          <rect x="13.2" y="11.2" width="2.2" height="2.2" {...glow} />
        </>
      );
    case RobotEyes.CYCLOPS:
      return (
        <>
          <circle cx="12" cy="12.4" r="2.1" {...glow} />
          <circle cx="12" cy="12.4" r="0.8" fill={look.face} />
        </>
      );
    case RobotEyes.SLITS:
      return (
        <>
          <rect x="8.5" y="12" width="2.6" height="0.9" rx="0.45" {...glow} />
          <rect x="12.9" y="12" width="2.6" height="0.9" rx="0.45" {...glow} />
        </>
      );
    case RobotEyes.RINGS:
      return (
        <>
          <circle cx="9.8" cy="12.4" r="1.3" fill="none" stroke={look.accent} strokeWidth="0.9" />
          <circle cx="14.2" cy="12.4" r="1.3" fill="none" stroke={look.accent} strokeWidth="0.9" />
        </>
      );
    default:
      return (
        <>
          <circle cx="9.8" cy="12.4" r="1.3" {...glow} />
          <circle cx="14.2" cy="12.4" r="1.3" {...glow} />
        </>
      );
  }
};

export const RobotMouth = ({ look }: PartProps) => {
  const line = { stroke: look.accent, strokeWidth: 0.8, strokeLinecap: "round" as const };

  switch (look.mouth) {
    case RobotMouths.SMILE:
      return <path d="M9.6 15.4 Q12 17.4 14.4 15.4" fill="none" {...line} />;
    case RobotMouths.LINE:
      return <line x1="9.6" y1="16.1" x2="14.4" y2="16.1" {...line} />;
    case RobotMouths.TEETH:
      return (
        <>
          <rect x="9.3" y="15.2" width="5.4" height="1.8" rx="0.4" fill="none" {...line} />
          <line x1="11.1" y1="15.2" x2="11.1" y2="17" {...line} />
          <line x1="12.9" y1="15.2" x2="12.9" y2="17" {...line} />
        </>
      );
    case RobotMouths.SPEAKER:
      return (
        <>
          <circle cx="10.2" cy="16.1" r="0.5" fill={look.accent} />
          <circle cx="12" cy="16.1" r="0.5" fill={look.accent} />
          <circle cx="13.8" cy="16.1" r="0.5" fill={look.accent} />
        </>
      );
    default:
      return (
        <>
          <line x1="10.2" y1="15.3" x2="10.2" y2="16.9" {...line} />
          <line x1="12" y1="15.3" x2="12" y2="16.9" {...line} />
          <line x1="13.8" y1="15.3" x2="13.8" y2="16.9" {...line} />
        </>
      );
  }
};
