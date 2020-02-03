/**
 * https://developer.apple.com/documentation/foundation/nsprocessinfo?language=objc
 */
declare class NSProcessInfo extends NSObject<NSProcessInfo> {
  /**
   * Returns the process information agent for the process.
   * https://developer.apple.com/documentation/foundation/nsprocessinfo/1408734-processinfo?language=objc
   */
  public processInfo: NSProcessInfo

  /**
   * Array of strings with the command-line arguments for the process.
   */
  public arguments: BridgedObject<Array<string>>
}