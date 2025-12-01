import { useState } from 'react';
import SmartDateInput from './SmartDateInput';

export default function DateDemo() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateTime, setDateTime] = useState(new Date().toISOString());

  return (
    <div className="p-8 space-y-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Smart Date Input Demo</h1>
      
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Date Only</h2>
        <SmartDateInput
          value={date}
          onChange={setDate}
          placeholder="Pick a date"
        />
        <p className="text-sm text-gray-500">Selected: {date}</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Date & Time</h2>
        <SmartDateInput
          value={dateTime}
          onChange={setDateTime}
          enableTime={true}
          placeholder="Pick date & time"
        />
        <p className="text-sm text-gray-500">Selected: {dateTime}</p>
      </div>
    </div>
  );
}
