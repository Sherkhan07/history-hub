import {
  BookOpen, BookOpenCheck, CircleCheckBig, ClipboardList, FileText, Film, FolderOpen, Gamepad2, Gem, GraduationCap,
  History, Home, Image as ImageIcon, LayoutDashboard, Layers, ListChecks, Map, MapPin, Presentation, ScrollText,
  Search, Settings, Shield, Shuffle, Star, Swords, Users, UserRound, Clock, Library, BarChart3, Inbox, Undo2,
  CheckCircle2, FilePlus2, Sparkles, NotebookPen, type LucideIcon,
} from "lucide-react";

export const ICONS = {
  BookOpen, BookOpenCheck, CircleCheckBig, ClipboardList, FileText, Film, FolderOpen, Gamepad2, Gem, GraduationCap,
  History, Home, ImageIcon, LayoutDashboard, Layers, ListChecks, Map, MapPin, Presentation, ScrollText, Search,
  Settings, Shield, Shuffle, Star, Swords, Users, UserRound, Clock, Library, BarChart3, Inbox, Undo2, CheckCircle2,
  FilePlus2, Sparkles, NotebookPen,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, ...props }: { name: IconName | string } & React.ComponentProps<LucideIcon>) {
  const Cmp = (ICONS as Record<string, LucideIcon>)[name] ?? Sparkles;
  return <Cmp aria-hidden {...props} />;
}

export const RESOURCE_ICONS: Record<string, IconName> = {
  PRESENTATION: "Presentation",
  WORKSHEET: "NotebookPen",
  TASK: "ClipboardList",
  CARDS: "Layers",
  DOCUMENT: "FileText",
  VIDEO: "Film",
  MAP: "Map",
  TEACHER_GUIDE: "BookOpenCheck",
  HOMEWORK: "Home",
  ADDITIONAL: "FolderOpen",
};
