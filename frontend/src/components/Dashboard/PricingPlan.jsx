import React from 'react';
import { FiCheckCircle } from 'react-icons/fi';

const PricingPlan = ({ 
  name, 
  price, 
  features, 
  popular = false, 
  className = '' 
}) => (
  <div className={`relative border ${
    popular 
      ? 'border-2 border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-gray-800/40' 
      : 'border-gray-200 dark:border-gray-700'
  } rounded-lg p-6 hover:shadow-md dark:hover:shadow-gray-700/50 transition-all duration-200 h-full flex flex-col ${className}`}
  >
    {popular && (
      <div className="absolute -top-3 right-4">
        <span className="bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full">
          Most Popular
        </span>
      </div>
    )}
    <div className="flex-1">
      <h3 className={`font-medium ${popular ? 'text-indigo-900 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>
        {name}
      </h3>
      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
        ${price}<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/month</span>
      </p>
      <ul className="mt-4 space-y-2">
        {features.map((feature, index) => (
          <li key={index} className={`flex items-center ${feature.included ? '' : 'text-gray-400 dark:text-gray-500'}`}>
            <FiCheckCircle className={`h-5 w-5 mr-2 flex-shrink-0 ${feature.included ? 'text-green-500' : ''}`} />
            <span className={popular && feature.included ? 'text-indigo-900 dark:text-gray-300' : ''}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
    <button 
      className={`mt-6 w-full py-2.5 px-4 rounded-lg transition-colors duration-200 font-medium ${
        popular 
          ? 'bg-indigo-700 hover:bg-indigo-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white' 
          : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white'
      }`}
    >
      Get Started
    </button>
  </div>
);

export default PricingPlan;
