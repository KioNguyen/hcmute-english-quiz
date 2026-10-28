import Foundation
import Vision
import AppKit

// Usage: swift ocr.swift <image> -> prints recognized lines (top to bottom)
let path = CommandLine.arguments[1]
guard let img = NSImage(contentsOfFile: path),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(1) }
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = true
req.recognitionLanguages = ["en-US"]
try VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
let obs = (req.results ?? []).sorted { $0.boundingBox.maxY > $1.boundingBox.maxY }
for o in obs { if let t = o.topCandidates(1).first { print(t.string) } }
