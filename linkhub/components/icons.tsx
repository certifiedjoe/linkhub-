import type { ComponentType } from 'react';
import {
  Link as LinkIcon,
  Music2,
  Mail,
  Phone,
  Globe,
  ShoppingBag,
  Calendar,
  FileText,
  MapPin,
  Heart,
} from 'lucide-react';
import {
  SiInstagram,
  SiYoutube,
  SiTiktok,
  SiX,
  SiFacebook,
  SiWhatsapp,
  SiTelegram,
  SiGithub,
} from 'react-icons/si';
import { FaLinkedin } from 'react-icons/fa6';

type Glyph = ComponentType<{ className?: string }>;

export const ICONS: { key: string; label: string; Icon: Glyph }[] = [
  { key: 'link', label: 'Link', Icon: LinkIcon },
  { key: 'instagram', label: 'Instagram', Icon: SiInstagram },
  { key: 'youtube', label: 'YouTube', Icon: SiYoutube },
  { key: 'tiktok', label: 'TikTok', Icon: SiTiktok },
  { key: 'twitter', label: 'X (Twitter)', Icon: SiX },
  { key: 'facebook', label: 'Facebook', Icon: SiFacebook },
  { key: 'whatsapp', label: 'WhatsApp', Icon: SiWhatsapp },
  { key: 'telegram', label: 'Telegram', Icon: SiTelegram },
  { key: 'linkedin', label: 'LinkedIn', Icon: FaLinkedin },
  { key: 'github', label: 'GitHub', Icon: SiGithub },
  { key: 'music', label: 'Music', Icon: Music2 },
  { key: 'email', label: 'Email', Icon: Mail },
  { key: 'phone', label: 'Phone', Icon: Phone },
  { key: 'website', label: 'Website', Icon: Globe },
  { key: 'shop', label: 'Shop', Icon: ShoppingBag },
  { key: 'booking', label: 'Booking', Icon: Calendar },
  { key: 'document', label: 'Document', Icon: FileText },
  { key: 'location', label: 'Location', Icon: MapPin },
  { key: 'support', label: 'Support me', Icon: Heart },
];

const MAP = new Map<string, Glyph>(ICONS.map((i) => [i.key, i.Icon]));

export function LinkGlyph({ icon, className = 'h-5 w-5' }: { icon: string; className?: string }) {
  const Icon = MAP.get(icon) || LinkIcon;
  return <Icon className={className} />;
}

/** Guess a sensible icon from a pasted URL. */
export function guessIcon(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('instagram')) return 'instagram';
  if (u.includes('youtu')) return 'youtube';
  if (u.includes('tiktok')) return 'tiktok';
  if (u.includes('twitter') || u.includes('x.com')) return 'twitter';
  if (u.includes('facebook') || u.includes('fb.me')) return 'facebook';
  if (u.includes('wa.me') || u.includes('whatsapp')) return 'whatsapp';
  if (u.includes('t.me') || u.includes('telegram')) return 'telegram';
  if (u.includes('linkedin')) return 'linkedin';
  if (u.includes('github')) return 'github';
  if (u.includes('spotify') || u.includes('audiomack') || u.includes('boomplay')) return 'music';
  if (u.startsWith('mailto:') || u.includes('@')) return 'email';
  if (u.startsWith('tel:')) return 'phone';
  if (u.includes('maps.') || u.includes('goo.gl/maps')) return 'location';
  if (u.includes('shop') || u.includes('store') || u.includes('jumia')) return 'shop';
  if (u.includes('calendly') || u.includes('book')) return 'booking';
  return 'link';
}

export const THEMES = [
  { key: 'ember', label: 'Ember', swatch: 'linear-gradient(135deg,#f4622e,#2b1a14)' },
  { key: 'daylight', label: 'Daylight', swatch: 'linear-gradient(135deg,#f6ead6,#e2b887)' },
  { key: 'tide', label: 'Tide', swatch: 'linear-gradient(135deg,#2e8f9c,#0f1e28)' },
  { key: 'bloom', label: 'Bloom', swatch: 'linear-gradient(135deg,#c65fa8,#241120)' },
];
