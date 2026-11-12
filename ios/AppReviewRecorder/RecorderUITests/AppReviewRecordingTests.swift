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
///   RECORDER_RESET     1 = reset the app first when it isn't empty (preflight.reset)
final class AppReviewRecordingTests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    func testRecordAppReview() throws {
        let bundle = Bundle(for: AppReviewRecordingTests.self)
        guard let url = bundle.url(forResource: "scenes", withExtension: "json") else {
            return XCTFail("scenes.json isn't in the test bundle")
        }
        let spec = try RecordingSpec(json: Data(contentsOf: url))
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
