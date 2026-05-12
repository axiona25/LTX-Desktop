import logoUrl from '../../images/Logo.png'

interface AxStudioLogoProps {
  className?: string
  imageClassName?: string
}

export function AxStudioLogo({ className = '', imageClassName = 'h-7 w-auto' }: AxStudioLogoProps) {
  return (
    <img
      src={logoUrl}
      alt="AXSTUDIO"
      className={`${imageClassName} ${className}`}
      draggable={false}
    />
  )
}
