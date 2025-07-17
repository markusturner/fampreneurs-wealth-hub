import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Keyboard } from '@capacitor/keyboard'
import { StatusBar, Style } from '@capacitor/status-bar'

export class MobileService {
  static isNative(): boolean {
    return Capacitor.isNativePlatform()
  }

  static isMobile(): boolean {
    return Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios'
  }

  static async setupStatusBar(): Promise<void> {
    if (this.isNative()) {
      try {
        await StatusBar.setStyle({ style: Style.Default })
        await StatusBar.setBackgroundColor({ color: '#ffffff' })
      } catch (error) {
        console.warn('StatusBar not available:', error)
      }
    }
  }

  static async triggerHaptic(style: ImpactStyle = ImpactStyle.Light): Promise<void> {
    if (this.isNative()) {
      try {
        await Haptics.impact({ style })
      } catch (error) {
        console.warn('Haptics not available:', error)
      }
    }
  }

  static async hideKeyboard(): Promise<void> {
    if (this.isNative()) {
      try {
        await Keyboard.hide()
      } catch (error) {
        console.warn('Keyboard not available:', error)
      }
    }
  }

  static async setupKeyboard(): Promise<void> {
    if (this.isNative()) {
      try {
        // Listen for keyboard events
        Keyboard.addListener('keyboardWillShow', (info) => {
          document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`)
        })

        Keyboard.addListener('keyboardWillHide', () => {
          document.body.style.setProperty('--keyboard-height', '0px')
        })
      } catch (error) {
        console.warn('Keyboard listeners not available:', error)
      }
    }
  }

  static getPlatform(): string {
    return Capacitor.getPlatform()
  }

  static isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android'
  }

  static isIOS(): boolean {
    return Capacitor.getPlatform() === 'ios'
  }
}

// Initialize mobile services
export const initializeMobileServices = async (): Promise<void> => {
  if (MobileService.isNative()) {
    await MobileService.setupStatusBar()
    await MobileService.setupKeyboard()
  }
}