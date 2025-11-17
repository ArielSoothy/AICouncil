'use client'

import { useState } from 'react'
import { Question } from '@/lib/intake/types'

interface QuestionCardProps {
  question: Question
  value?: any
  onChange: (value: any) => void
  onValidate?: (valid: boolean, error?: string) => void
  showValidation?: boolean
}

export function QuestionCard({
  question,
  value,
  onChange,
  onValidate,
  showValidation = false
}: QuestionCardProps) {
  const [error, setError] = useState<string>()

  const handleChange = (newValue: any) => {
    onChange(newValue)

    // Validate if validation function provided
    if (onValidate) {
      const validation = validateAnswer(newValue)
      setError(validation.error)
      onValidate(validation.valid, validation.error)
    }
  }

  const validateAnswer = (answer: any): { valid: boolean; error?: string } => {
    // Required check
    if (question.required && (answer === undefined || answer === null || answer === '')) {
      return { valid: false, error: 'This question is required' }
    }

    // Type-specific validation
    switch (question.type) {
      case 'number':
        if (answer !== undefined && answer !== '') {
          if (isNaN(Number(answer))) {
            return { valid: false, error: 'Please enter a valid number' }
          }
          if (Number(answer) < 0) {
            return { valid: false, error: 'Please enter a positive number' }
          }
        }
        break

      case 'scale':
        if (answer !== undefined && answer !== '') {
          const num = Number(answer)
          if (isNaN(num) || num < 1 || num > 10) {
            return { valid: false, error: 'Please enter a number between 1 and 10' }
          }
        }
        break

      case 'enum':
        if (answer && question.options && !question.options.includes(answer)) {
          return { valid: false, error: 'Please select a valid option' }
        }
        break

      case 'multi-select':
        if (answer && !Array.isArray(answer)) {
          return { valid: false, error: 'Invalid selection' }
        }
        break
    }

    // Custom validation
    if (question.validation && answer !== undefined && !question.validation(answer)) {
      return { valid: false, error: 'Invalid answer format' }
    }

    return { valid: true }
  }

  const getWeightBadge = () => {
    const badges = {
      10: { label: 'Critical', color: 'bg-red-500' },
      7: { label: 'Important', color: 'bg-orange-500' },
      5: { label: 'Moderate', color: 'bg-yellow-500' },
      3: { label: 'Optional', color: 'bg-gray-400' },
      1: { label: 'Optional', color: 'bg-gray-400' }
    }
    const badge = badges[question.weight]
    return (
      <span className={`${badge.color} text-white text-xs px-2 py-1 rounded`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
      {/* Question Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {question.text}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          {question.helpText && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {question.helpText}
            </p>
          )}
        </div>
        <div className="ml-4">
          {getWeightBadge()}
        </div>
      </div>

      {/* Input Field Based on Type */}
      <div className="mt-4">
        {question.type === 'text' && (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={question.placeholder}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        )}

        {question.type === 'number' && (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={question.placeholder}
            min="0"
            step="any"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        )}

        {question.type === 'boolean' && (
          <div className="flex gap-4">
            <button
              onClick={() => handleChange(true)}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                value === true
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => handleChange(false)}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                value === false
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
            >
              No
            </button>
          </div>
        )}

        {question.type === 'enum' && question.options && (
          <select
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select an option...</option>
            {question.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}

        {question.type === 'multi-select' && question.options && (
          <div className="space-y-2">
            {question.options.map((option) => (
              <label key={option} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(value || []).includes(option)}
                  onChange={(e) => {
                    const currentValues = value || []
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter((v: string) => v !== option)
                    handleChange(newValues)
                  }}
                  className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'scale' && (
          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="10"
              value={value || 5}
              onChange={(e) => handleChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>1</span>
              <span className="font-semibold text-blue-500">{value || 5}</span>
              <span>10</span>
            </div>
          </div>
        )}

        {question.type === 'date' && (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        )}

        {question.type === 'date-range' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={value?.start || ''}
                onChange={(e) => handleChange({ ...value, start: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={value?.end || ''}
                onChange={(e) => handleChange({ ...value, end: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {showValidation && error && (
        <div className="mt-2 text-sm text-red-500">
          {error}
        </div>
      )}
    </div>
  )
}
