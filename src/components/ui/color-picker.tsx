'use client'

import { useState } from 'react'

interface ColorPickerProps {
  value: string // hex color value or 'transparent'
  onChange: (color: string) => void
  presetColors?: string[]
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  // Define the color palette
  const colorPalette = {
    // Row 1: Grayscale (black to white)
    grayscale: [
      '#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666',
      '#999999', '#b3b3b3', '#cccccc', '#e6e6e6', '#ffffff'
    ],
    // Row 2: Bright colors
    bright: [
      '#8B0000', '#FF0000', '#FF8C00', '#FFD700', '#00FF00',
      '#00FFFF', '#0000FF', '#00008B', '#800080', '#FF00FF'
    ],
    // Rows 3-8: Pastel variations (6 rows of 10 colors each)
    pastels: [
      // Row 3: Light pastels
      ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#C9C9FF', '#E0BBE4', '#FFDFD3', '#FFC8DD', '#FFE5EC'],
      // Row 4: Soft pastels
      ['#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA', '#D4A5A5', '#FFAAA5', '#FFB3C1', '#FFC9DE'],
      // Row 5: Medium pastels
      ['#FF8FA3', '#FFA07A', '#FFD1A4', '#D5E8CF', '#A8E6CF', '#B4C7E7', '#C5A3C0', '#FF9999', '#FFA3B5', '#FFB5C5'],
      // Row 6: Deeper pastels
      ['#FF7B9C', '#FF8C69', '#FFC48C', '#C8E6C9', '#9BDBC0', '#A1B9D6', '#B692B0', '#FF8888', '#FF94A8', '#FFA1B4'],
      // Row 7: Rich pastels
      ['#FF6B8A', '#FF7F50', '#FFB76B', '#BBE5B3', '#8ED1B0', '#8EABC5', '#A781A0', '#FF7777', '#FF85A1', '#FF8DA3'],
      // Row 8: Vibrant pastels
      ['#FF5A7A', '#FF6347', '#FFA94D', '#AEE3A8', '#81C7A0', '#7B9DB4', '#987090', '#FF6666', '#FF7690', '#FF7992']
    ]
  }

  const handleColorSelect = (color: string) => {
    onChange(color)
  }

  const handleTransparentSelect = () => {
    onChange('transparent')
  }

  return (
    <div className="w-full max-w-md bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      {/* Transparent Option */}
      <div className="mb-4">
        <button
          type="button"
          onClick={handleTransparentSelect}
          className={`w-full h-10 rounded-md border-2 flex items-center justify-center transition-all ${
            value === 'transparent'
              ? 'border-black bg-gray-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          title="Transparent"
        >
          <svg
            className="w-6 h-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </button>
      </div>

      {/* Color Grid */}
      <div className="space-y-2">
        {/* Row 1: Grayscale */}
        <div className="grid grid-cols-10 gap-2">
          {colorPalette.grayscale.map((color, index) => (
            <button
              type="button"
              key={`gray-${index}`}
              onClick={() => handleColorSelect(color)}
              className={`w-8 h-8 rounded-full transition-all ${
                value === color
                  ? 'ring-2 ring-black ring-offset-2 scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Row 2: Bright Colors */}
        <div className="grid grid-cols-10 gap-2">
          {colorPalette.bright.map((color, index) => (
            <button
              type="button"
              key={`bright-${index}`}
              onClick={() => handleColorSelect(color)}
              className={`w-8 h-8 rounded-full transition-all ${
                value === color
                  ? 'ring-2 ring-black ring-offset-2 scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Rows 3-8: Pastel Variations */}
        {colorPalette.pastels.map((row, rowIndex) => (
          <div key={`pastel-row-${rowIndex}`} className="grid grid-cols-10 gap-2">
            {row.map((color, colIndex) => (
              <button
                type="button"
                key={`pastel-${rowIndex}-${colIndex}`}
                onClick={() => handleColorSelect(color)}
                className={`w-8 h-8 rounded-full transition-all ${
                  value === color
                    ? 'ring-2 ring-black ring-offset-2 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        ))}
      </div>

      {/* THEME Label */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-2 text-gray-600">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          <span className="text-xs font-medium tracking-wider">THEME</span>
        </div>
      </div>
    </div>
  )
}
