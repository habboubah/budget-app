import XCTest

/// Records the App Review screen recording on a connected iPhone.
///
/// Run it with `npm run record:app-review` (scripts/record-app-review.sh).
/// It drives the Spartopf that is installed on the iPhone (the TestFlight
/// build), starts the iOS screen recording from Control Center, plays
/// scenes.json and stops the recording; the video lands in Photos.
///
/// Settings, passed by the script as TEST_RUNNER_… environment variables:
///   RECORDER_PACE      1 = normal, 1.5 = slower, 0.5 = faster
///   RECORDER_FROM / RECORDER_TO   only these scenes (no preflight)
///   RECORDER_NO_VIDEO  1 = a dry run without the screen recording
///   RECORDER_RESET     1 = reset the app before the recording starts (preflight.reset)
///   RECORDER_UPDATE    1 = only update the app from TestFlight (testUpdateFromTestFlight)
final class AppReviewRecordingTests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    private func loadSpec() throws -> RecordingSpec? {
        let bundle = Bundle(for: AppReviewRecordingTests.self)
        guard let url = bundle.url(forResource: "scenes", withExtension: "json") else {
            XCTFail("scenes.json isn't in the test bundle")
            return nil
        }
        return try RecordingSpec(json: Data(contentsOf: url))
    }

    /// Not part of the recording: the script runs this alone (RECORDER_UPDATE=1)
    /// when the iPhone has an older build than scenes.json › app.minVersion, to
    /// update the app from TestFlight before anything is filmed.
    func testUpdateFromTestFlight() throws {
        guard ProcessInfo.processInfo.environment["RECORDER_UPDATE"] == "1" else {
            throw XCTSkip("Only when the script asks for it (RECORDER_UPDATE=1).")
        }
        guard let spec = try loadSpec() else { return }
        let runner = SceneRunner(spec: spec, pace: 1, noVideo: true)
        do {
            try runner.updateFromTestFlight()
        } catch {
            runner.attachScreenshot(named: "TestFlight – where it stopped")
            XCUIDevice.shared.press(.home)
            XCTFail("\(error)")
        }
    }

    func testRecordAppReview() throws {
        guard let spec = try loadSpec() else { return }
        let env = ProcessInfo.processInfo.environment
        let pace = Double(env["RECORDER_PACE"] ?? "") ?? 1
        let from = max(1, Int(env["RECORDER_FROM"] ?? "") ?? 1)
        let to = min(spec.scenes.count, Int(env["RECORDER_TO"] ?? "") ?? spec.scenes.count)
        let noVideo = env["RECORDER_NO_VIDEO"] == "1"
        let reset = env["RECORDER_RESET"] == "1"
        guard from <= to else { return XCTFail("RECORDER_FROM \(from) is after RECORDER_TO \(to)") }

        let runner = SceneRunner(spec: spec, pace: pace, noVideo: noVideo, reset: reset)
        runner.log("Scenes \(from)–\(to) of \(spec.scenes.count), pace \(pace)\(noVideo ? ", dry run" : "")")
        do {
            if from == 1 { try runner.preflight() }
            try runner.run(scenes: from...to)
            runner.stopRecordingIfNeeded()
            runner.log("Done.")
        } catch {
            runner.attachScreenshot(named: "Where it stopped")
            runner.stopRecordingIfNeeded()
            XCTFail("\(error)")
        }
    }
}
