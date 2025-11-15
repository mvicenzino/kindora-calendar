import CalendarHeader from '../CalendarHeader';
import { useState } from 'react';

export default function CalendarHeaderExample() {
  const [currentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");

  return (
    <CalendarHeader
      currentDate={currentDate}
      onPreviousMonth={() => console.log('Previous month')}
      onNextMonth={() => console.log('Next month')}
      onToday={() => console.log('Today clicked')}
      onAddEvent={() => console.log('Add event clicked')}
      view={view}
      onViewChange={setView}
    />
  );
}
