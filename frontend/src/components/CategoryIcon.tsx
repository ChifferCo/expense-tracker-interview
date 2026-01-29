import {
  Utensils,
  Car,
  Film,
  FileText,
  ShoppingBag,
  MoreHorizontal,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  utensils: Utensils,
  car: Car,
  film: Film,
  'file-text': FileText,
  'shopping-bag': ShoppingBag,
  'more-horizontal': MoreHorizontal,
};

interface CategoryIconProps {
  icon: string;
  className?: string;
}

export function CategoryIcon({ icon, className = 'w-8 h-8' }: CategoryIconProps) {
  const IconComponent = iconMap[icon] || MoreHorizontal;

  return (
    <div className={`p-2 bg-indigo-100 rounded-full text-indigo-600`}>
      <IconComponent className={className} />
    </div>
  );
}
