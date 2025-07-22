import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const TestSelect = () => {
  const [value, setValue] = useState('');

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Select Test</h2>
      <div className="w-64">
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
            <SelectItem value="option3">Option 3</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-2">Selected: {value}</p>
      </div>
    </div>
  );
};

export default TestSelect; 