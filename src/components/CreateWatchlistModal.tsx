'use client'

import { useState } from 'react'
import { X, Star, Eye, EyeOff } from 'lucide-react'

interface CreateWatchlistModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string, description: string, isPublic: boolean) => void
}

export default function CreateWatchlistModal({ isOpen, onClose, onSubmit }: CreateWatchlistModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(name.trim(), description.trim(), isPublic)
      // Reset form
      setName('')
      setDescription('')
      setIsPublic(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setName('')
      setDescription('')
      setIsPublic(false)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#1f1f25] to-[#0f0f11] border border-[#2a2a2e]/50 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a2e]/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-glowBlue to-glowPurple rounded-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Create Watchlist</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Watchlist Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Top Picks, DeFi Tokens"
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-[#0a0a0c] border border-[#2a2a2e]/50 rounded-lg text-white placeholder-gray-500 focus:border-glowBlue/50 focus:outline-none transition-colors disabled:opacity-50"
              required
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this watchlist is for..."
              disabled={isSubmitting}
              rows={3}
              className="w-full px-4 py-3 bg-[#0a0a0c] border border-[#2a2a2e]/50 rounded-lg text-white placeholder-gray-500 focus:border-glowBlue/50 focus:outline-none transition-colors disabled:opacity-50 resize-none"
            />
          </div>

          {/* Privacy Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Privacy
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  !isPublic 
                    ? 'bg-glowBlue/20 text-glowBlue border border-glowBlue/30' 
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <EyeOff size={16} />
                Private
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isPublic 
                    ? 'bg-glowGreen/20 text-glowGreen border border-glowGreen/30' 
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Eye size={16} />
                Public
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {isPublic 
                ? 'Anyone can view this watchlist' 
                : 'Only you can see this watchlist'
              }
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-white/5 text-gray-300 rounded-lg font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-glowBlue to-glowPurple text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Watchlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
