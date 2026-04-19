import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  PlusCircle, 
  CheckCircle2, 
  Trash2, 
  Edit, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Zap
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { kurdishLocale } from '../lib/kurdishLocale';

interface Activity {
  id: string;
  type: string;
  title: string;
  timestamp: string;
  entityType: 'transaction' | 'task' | 'wishlist' | 'debt' | 'invoice' | 'system';
  userId?: string;
}

interface Props {
  activities: Activity[];
}

const getIcon = (type: string) => {
  switch (type) {
    case 'transaction': return TrendingDown;
    case 'task': return CheckCircle2;
    case 'wishlist': return ShoppingBag;
    case 'debt': return TrendingUp;
    case 'invoice': return Zap;
    default: return Clock;
  }
};

const getColor = (type: string) => {
  switch (type) {
    case 'transaction': return 'text-rose-500 bg-rose-500/10';
    case 'task': return 'text-emerald-500 bg-emerald-500/10';
    case 'wishlist': return 'text-purple-500 bg-purple-500/10';
    case 'debt': return 'text-blue-500 bg-blue-500/10';
    case 'invoice': return 'text-amber-500 bg-amber-500/10';
    default: return 'text-slate-500 bg-slate-500/10';
  }
};

export const ActivityFeed: React.FC<Props> = ({ activities }) => {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
        <Clock className="w-12 h-12 mb-4" />
        <p className="text-sm font-bold">هیچ چالاکییەکی نوێ نییە</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black text-[var(--text-main)]">دواهەمین چالاکییەکان</h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-600/10 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
          ڕاستەوخۆ
        </div>
      </div>

      <div className="relative space-y-4">
        {/* Vertical Line */}
        <div className="absolute top-0 right-5 bottom-0 w-0.5 bg-[var(--border-color)] opacity-50 ml-[-1px]" />

        <AnimatePresence initial={false}>
          {activities.map((activity, idx) => {
            const Icon = getIcon(activity.entityType);
            const colorClass = getColor(activity.entityType);
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="relative flex items-start gap-6 group"
              >
                {/* Dot / Icon */}
                <div className={cn(
                  "relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
                  colorClass
                )}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-black text-[var(--text-main)] group-hover:text-blue-600 transition-colors">
                      {activity.title}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] italic">
                      {formatDistanceToNow(parseISO(activity.timestamp), { addSuffix: true, locale: kurdishLocale })}
                    </span>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] flex items-center gap-2">
                    <span className={cn("w-1 h-1 rounded-full", colorClass.split(' ')[0].replace('text-', 'bg-'))} />
                    {activity.type}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <button className="w-full py-4 mt-4 border border-dashed border-[var(--border-color)] rounded-2xl text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
        بینینی هەموو چالاکییەکان
      </button>
    </div>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
