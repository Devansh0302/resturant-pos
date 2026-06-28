import { useState, useRef, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Select Date' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? parseISO(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDate = value ? parseISO(value) : null;

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(new Date());
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center text-xs font-medium text-gray-500 w-8">
          {format(addDays(startDate, i), 'EEEE').substring(0, 2)}
        </div>
      );
    }
    return <div className="flex justify-between mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = 'd';
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());

        days.push(
          <button
            type="button"
            key={day.toString()}
            onClick={() => {
              onChange(format(cloneDay, 'yyyy-MM-dd'));
              setIsOpen(false);
            }}
            className={`w-8 h-8 flex items-center justify-center text-xs rounded-full transition-all ${
              !isCurrentMonth ? 'text-gray-300' :
              isSelected ? 'bg-emerald-500 text-white shadow-md font-semibold' :
              isToday ? 'bg-emerald-50 text-emerald-600 font-semibold' :
              'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {formattedDate}
          </button>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="flex justify-between mb-1" key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div>{rows}</div>;
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className="premium-input flex items-center gap-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
        style={{ paddingLeft: '14px', width: '100%', maxWidth: '200px' }}
      >
        <CalendarIcon className="w-4 h-4 text-gray-400" />
        <span className={`text-sm flex-1 ${!value ? 'text-gray-400' : 'text-gray-900'}`}>
          {value ? format(parseISO(value), 'MMM dd, yyyy') : placeholder}
        </span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 p-4 bg-white rounded-2xl shadow-xl border border-gray-100"
            style={{ width: '280px' }}
          >
            {renderHeader()}
            {renderDays()}
            {renderCells()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
