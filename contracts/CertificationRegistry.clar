(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-BUSINESS-ID u101)
(define-constant ERR-INVALID-AUDITOR-ID u102)
(define-constant ERR-INVALID-ISSUE-DATE u103)
(define-constant ERR-INVALID-EXPIRY-DATE u104)
(define-constant ERR-INVALID-STATUS u105)
(define-constant ERR-CERT-ALREADY-EXISTS u106)
(define-constant ERR-CERT-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-AUDITOR-NOT-VERIFIED u109)
(define-constant ERR-INVALID-SCORE u110)
(define-constant ERR-INVALID-RENEWAL-PERIOD u111)
(define-constant ERR-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-CERTS-EXCEEDED u114)
(define-constant ERR-INVALID-CERT-TYPE u115)
(define-constant ERR-INVALID-COMPLIANCE-LEVEL u116)
(define-constant ERR-INVALID-GRACE-PERIOD u117)
(define-constant ERR-INVALID-LOCATION u118)
(define-constant ERR-INVALID-CATEGORY u119)
(define-constant ERR-INVALID-REVIEW-RATE u120)
(define-constant ERR-INVALID-PROOF-HASH u121)
(define-constant ERR-INVALID-METRICS u122)
(define-constant ERR-INVALID-REVOKE-REASON u123)
(define-constant ERR-AUTHORITY-NOT-SET u124)
(define-constant ERR-INVALID-AUTHORITY u125)

(define-data-var next-cert-id uint u0)
(define-data-var max-certs uint u10000)
(define-data-var issuance-fee uint u500)
(define-data-var authority-contract (optional principal) none)

(define-map certifications
  principal
  {
    cert-id: uint,
    auditor-id: principal,
    issue-date: uint,
    expiry-date: uint,
    status: bool,
    score: uint,
    renewal-period: uint,
    cert-type: (string-utf8 50),
    compliance-level: uint,
    grace-period: uint,
    location: (string-utf8 100),
    category: (string-utf8 50),
    review-rate: uint,
    proof-hash: (buff 32),
    metrics: (tuple (carbon uint) (waste uint) (energy uint))
  }
)

(define-map cert-updates
  principal
  {
    update-score: uint,
    update-expiry: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-map certified-businesses uint principal)

(define-read-only (get-certification (business-id principal))
  (map-get? certifications business-id)
)

(define-read-only (get-cert-update (business-id principal))
  (map-get? cert-updates business-id)
)

(define-read-only (is-certified (business-id principal))
  (is-some (map-get? certifications business-id))
)

(define-read-only (list-certified-businesses)
  (let ((max-id (var-get next-cert-id)))
    (filter is-some
      (map get-business-by-id
        (list
          u0 u1 u2 u3 u4 u5 u6 u7 u8 u9
          u10 u11 u12 u13 u14 u15 u16 u17 u18 u19
          u20 u21 u22 u23 u24 u25 u26 u27 u28 u29
          u30 u31 u32 u33 u34 u35 u36 u37 u38 u39
          u40 u41 u42 u43 u44 u45 u46 u47 u48 u49
        )
      )
    )
  )
)

(define-private (get-business-by-id (id uint))
  (map-get? certified-businesses id)
)

(define-private (validate-business-id (id principal))
  (ok true)
)

(define-private (validate-auditor-id (id principal))
  (if (not (is-eq id 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-INVALID-AUDITOR-ID))
)

(define-private (validate-issue-date (date uint))
  (if (<= date block-height)
      (ok true)
      (err ERR-INVALID-ISSUE-DATE))
)

(define-private (validate-expiry-date (date uint))
  (if (> date block-height)
      (ok true)
      (err ERR-INVALID-EXPIRY-DATE))
)

(define-private (validate-score (score uint))
  (if (and (>= score u0) (<= score u100))
      (ok true)
      (err ERR-INVALID-SCORE))
)

(define-private (validate-renewal-period (period uint))
  (if (> period u0)
      (ok true)
      (err ERR-INVALID-RENEWAL-PERIOD))
)

(define-private (validate-cert-type (type (string-utf8 50)))
  (if (or (is-eq type u"eco") (is-eq type u"green") (is-eq type u"sustainable"))
      (ok true)
      (err ERR-INVALID-CERT-TYPE))
)

(define-private (validate-compliance-level (level uint))
  (if (and (>= level u1) (<= level u5))
      (ok true)
      (err ERR-INVALID-COMPLIANCE-LEVEL))
)

(define-private (validate-grace-period (period uint))
  (if (<= period u90)
      (ok true)
      (err ERR-INVALID-GRACE-PERIOD))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-category (cat (string-utf8 50)))
  (if (and (> (len cat) u0) (<= (len cat) u50))
      (ok true)
      (err ERR-INVALID-CATEGORY))
)

(define-private (validate-review-rate (rate uint))
  (if (<= rate u10)
      (ok true)
      (err ERR-INVALID-REVIEW-RATE))
)

(define-private (validate-proof-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-PROOF-HASH))
)

(define-private (validate-metrics (metrics (tuple (carbon uint) (waste uint) (energy uint))))
  (if (and (> (get carbon metrics) u0) (> (get waste metrics) u0) (> (get energy metrics) u0))
      (ok true)
      (err ERR-INVALID-METRICS))
)

(define-private (validate-revoke-reason (reason (string-utf8 200)))
  (if (and (> (len reason) u0) (<= (len reason) u200))
      (ok true)
      (err ERR-INVALID-REVOKE-REASON))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-auditor-id contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-certs (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set max-certs new-max)
    (ok true)
  )
)

(define-public (set-issuance-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set issuance-fee new-fee)
    (ok true)
  )
)

(define-public (issue-certification
  (business-id principal)
  (auditor-id principal)
  (issue-date uint)
  (expiry-date uint)
  (score uint)
  (renewal-period uint)
  (cert-type (string-utf8 50))
  (compliance-level uint)
  (grace-period uint)
  (location (string-utf8 100))
  (category (string-utf8 50))
  (review-rate uint)
  (proof-hash (buff 32))
  (metrics (tuple (carbon uint) (waste uint) (energy uint)))
)
  (let (
      (next-id (var-get next-cert-id))
      (current-max (var-get max-certs))
      (authority (var-get authority-contract))
      (valid-business-id (try! (validate-business-id business-id)))
      (valid-auditor-id (try! (validate-auditor-id auditor-id)))
      (valid-issue-date (try! (validate-issue-date issue-date)))
      (valid-expiry-date (try! (validate-expiry-date expiry-date)))
      (valid-score (try! (validate-score score)))
      (valid-renewal-period (try! (validate-renewal-period renewal-period)))
      (valid-cert-type (try! (validate-cert-type cert-type)))
      (valid-compliance-level (try! (validate-compliance-level compliance-level)))
      (valid-grace-period (try! (validate-grace-period grace-period)))
      (valid-location (try! (validate-location location)))
      (valid-category (try! (validate-category category)))
      (valid-review-rate (try! (validate-review-rate review-rate)))
      (valid-proof-hash (try! (validate-proof-hash proof-hash)))
      (valid-metrics (try! (validate-metrics metrics)))
    )
    (asserts! (< next-id current-max) (err ERR-MAX-CERTS-EXCEEDED))
    (asserts! (is-none (map-get? certifications business-id)) (err ERR-CERT-ALREADY-EXISTS))
    (asserts! (is-eq tx-sender auditor-id) (err ERR-NOT-AUTHORIZED))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-SET))))
      (try! (stx-transfer? (var-get issuance-fee) tx-sender authority-recipient))
    )
    (map-set certifications business-id
      {
        cert-id: next-id,
        auditor-id: auditor-id,
        issue-date: issue-date,
        expiry-date: expiry-date,
        status: true,
        score: score,
        renewal-period: renewal-period,
        cert-type: cert-type,
        compliance-level: compliance-level,
        grace-period: grace-period,
        location: location,
        category: category,
        review-rate: review-rate,
        proof-hash: proof-hash,
        metrics: metrics
      }
    )
    (map-set certified-businesses next-id business-id)
    (var-set next-cert-id (+ next-id u1))
    (print { event: "cert-issued", business: business-id, cert-id: next-id })
    (ok next-id)
  )
)

(define-public (revoke-certification (business-id principal) (reason (string-utf8 200)))
  (let (
      (cert (map-get? certifications business-id))
      (valid-reason (try! (validate-revoke-reason reason)))
    )
    (match cert
      c
        (begin
          (asserts! (is-eq (get auditor-id c) tx-sender) (err ERR-NOT-AUTHORIZED))
          (map-set certifications business-id
            (merge c { status: false })
          )
          (print { event: "cert-revoked", business: business-id, reason: reason })
          (ok true)
        )
      (err ERR-CERT-NOT-FOUND)
    )
  )
)

(define-public (update-certification (business-id principal) (new-score uint) (new-expiry uint))
  (let (
      (cert (map-get? certifications business-id))
      (valid-score (try! (validate-score new-score)))
      (valid-expiry (try! (validate-expiry-date new-expiry)))
    )
    (match cert
      c
        (begin
          (asserts! (is-eq (get auditor-id c) tx-sender) (err ERR-NOT-AUTHORIZED))
          (map-set certifications business-id
            (merge c { score: new-score, expiry-date: new-expiry })
          )
          (map-set cert-updates business-id
            {
              update-score: new-score,
              update-expiry: new-expiry,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "cert-updated", business: business-id })
          (ok true)
        )
      (err ERR-CERT-NOT-FOUND)
    )
  )
)

(define-public (get-cert-count)
  (ok (var-get next-cert-id))
)

(define-public (check-cert-validity (business-id principal))
  (match (map-get? certifications business-id)
    c (ok (and (get status c) (< block-height (get expiry-date c))))
    (ok false)
  )
)