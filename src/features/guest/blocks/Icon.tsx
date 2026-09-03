import {
  AlertTriangle, Baby, Ban, Bath, Bed, Camera, CameraOff, CheckCircle, ChevronsUpDown,
  Cigarette, CigaretteOff, ClipboardList, Clock, Dog, DoorClosed, Droplets, Flame,
  Footprints, GalleryHorizontal, Heading, HelpCircle, Home, Image, Info, Key, LayoutGrid,
  Lightbulb, LogOut, Map, MapPin, MessageCircle, Minus, Moon, MousePointerClick, PanelTop,
  PartyPopper, PawPrint, PhoneCall, Recycle, ShieldCheck, Sparkles, SquareStack,
  Thermometer, Trash2, Type, Users, Utensils, Volume2, VolumeX, Wifi, Wine,
  type LucideProps,
} from 'lucide-react'

/**
 * Every icon reachable by name: the IconPicker's curated set, the block palette
 * metadata, and the icons baked into the default content.
 *
 * This registry exists so the guest page does not pay for the whole library. A
 * namespace import (`import * as Lucide`) defeats tree shaking and pulled ~1500
 * icons — 683 kB — into the chunk a guest downloads on their phone.
 */
const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  AlertTriangle, Baby, Ban, Bath, Bed, Camera, CameraOff, CheckCircle, ChevronsUpDown,
  Cigarette, CigaretteOff, ClipboardList, Clock, Dog, DoorClosed, Droplets, Flame,
  Footprints, GalleryHorizontal, Heading, HelpCircle, Home, Image, Info, Key, LayoutGrid,
  Lightbulb, LogOut, Map, MapPin, MessageCircle, Minus, Moon, MousePointerClick, PanelTop,
  PartyPopper, PawPrint, PhoneCall, Recycle, ShieldCheck, Sparkles, SquareStack,
  Thermometer, Trash2, Type, Users, Utensils, Volume2, VolumeX, Wifi, Wine,
}

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = ICONS[name] ?? HelpCircle
  return <Cmp {...props} />
}
