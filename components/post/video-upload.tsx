/**
 * Video Upload Component
 * Handles video file selection, validation, and upload to Mux
 */

'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, X, Video as VideoIcon, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createVideoUploadAction, cancelVideoUploadAction } from '@/app/actions/videoActions'
import { VIDEO_CONSTRAINTS } from '@/schemas/videoSchema'

interface VideoUploadProps {
    clubId: string
    onSuccess?: (postId: string) => void
    onCancel?: () => void
}

export default function VideoUpload({ clubId, onSuccess, onCancel }: VideoUploadProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [caption, setCaption] = useState('')
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [postId, setPostId] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const uploadRef = useRef<XMLHttpRequest | null>(null)

    // Validate file
    const validateFile = (file: File): string | null => {
        // Check file type
        if (!VIDEO_CONSTRAINTS.ALLOWED_MIME_TYPES.some(type => file.type === type)) {
            return 'Formato de video no soportado. Usa MP4, MOV, AVI, WebM o MKV.'
        }

        // Check file size (500 MB)
        if (file.size > VIDEO_CONSTRAINTS.MAX_FILE_SIZE) {
            const maxSizeMB = VIDEO_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)
            return `El archivo es demasiado grande. Máximo ${maxSizeMB} MB.`
        }

        return null
    }

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const validationError = validateFile(file)
        if (validationError) {
            setError(validationError)
            return
        }

        setSelectedFile(file)
        setError(null)
    }

    // Handle upload
    const handleUpload = async () => {
        if (!selectedFile) return

        setIsUploading(true)
        setError(null)

        try {
            // Step 1: Create post and get Direct Upload URL
            const result = await createVideoUploadAction({
                club_id: clubId,
                caption
            })

            if (!result.success || !result.data) {
                setError(result.error || 'Error al iniciar upload')
                setIsUploading(false)
                return
            }

            const { postId: newPostId, uploadUrl } = result.data
            setPostId(newPostId)

            // Step 2: Upload file directly to Mux
            const xhr = new XMLHttpRequest()
            uploadRef.current = xhr

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const progress = Math.round((e.loaded / e.total) * 100)
                    setUploadProgress(progress)
                }
            })

            xhr.addEventListener('load', () => {
                if (xhr.status === 200 || xhr.status === 201) {
                    setIsUploading(false)
                    setUploadProgress(100)
                    onSuccess?.(newPostId)
                } else {
                    setError('Error al subir video')
                    setIsUploading(false)
                }
            })

            xhr.addEventListener('error', () => {
                setError('Error de red al subir video')
                setIsUploading(false)
            })

            xhr.open('PUT', uploadUrl)
            xhr.send(selectedFile)
        } catch (error) {
            console.error('Upload error:', error)
            setError(error instanceof Error ? error.message : 'Error desconocido')
            setIsUploading(false)
        }
    }

    // Handle cancel
    const handleCancel = async () => {
        if (uploadRef.current) {
            uploadRef.current.abort()
        }

        if (postId) {
            await cancelVideoUploadAction(postId)
        }

        setSelectedFile(null)
        setCaption('')
        setUploadProgress(0)
        setIsUploading(false)
        setError(null)
        setPostId(null)
        onCancel?.()
    }

    // Format file size
    const formatFileSize = (bytes: number): string => {
        const mb = bytes / (1024 * 1024)
        return `${mb.toFixed(2)} MB`
    }

    return (
        <Card className="p-6">
            <div className="space-y-4">
                {/* File Selection */}
                {!selectedFile && (
                    <div
                        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <VideoIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm font-medium mb-1">Selecciona un video</p>
                        <p className="text-xs text-muted-foreground">
                            MP4, MOV, AVI, WebM o MKV • Máximo 500 MB • Máximo 60 minutos
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={VIDEO_CONSTRAINTS.ALLOWED_MIME_TYPES.join(',')}
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                )}

                {/* Selected File Info */}
                {selectedFile && !isUploading && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                            <VideoIcon className="w-8 h-8 text-primary" />
                            <div>
                                <p className="text-sm font-medium">{selectedFile.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedFile(null)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                {/* Caption Input */}
                {selectedFile && !isUploading && (
                    <div>
                        <Label htmlFor="caption">Descripción (opcional)</Label>
                        <Input
                            id="caption"
                            placeholder="Añade una descripción..."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            maxLength={2000}
                        />
                    </div>
                )}

                {/* Upload Progress */}
                {isUploading && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span>Subiendo video...</span>
                            <span className="font-medium">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} />
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Success Message */}
                {uploadProgress === 100 && !isUploading && (
                    <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>
                            Video subido correctamente. Procesando...
                        </AlertDescription>
                    </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {!isUploading && uploadProgress < 100 && (
                        <>
                            <Button
                                onClick={handleUpload}
                                disabled={!selectedFile}
                                className="flex-1"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Subir Video
                            </Button>
                            <Button variant="outline" onClick={handleCancel}>
                                Cancelar
                            </Button>
                        </>
                    )}
                    {isUploading && (
                        <Button variant="outline" onClick={handleCancel} className="w-full">
                            Cancelar Upload
                        </Button>
                    )}
                    {uploadProgress === 100 && !isUploading && (
                        <Button onClick={() => onCancel?.()} className="w-full">
                            Cerrar
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    )
}
