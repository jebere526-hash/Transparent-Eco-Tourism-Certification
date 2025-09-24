import { describe, it, expect, beforeEach } from "vitest";
import { noneCV, principalCV, someCV, stringUtf8CV, tupleCV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_BUSINESS_ID = 101;
const ERR_INVALID_AUDITOR_ID = 102;
const ERR_INVALID_ISSUE_DATE = 103;
const ERR_INVALID_EXPIRY_DATE = 104;
const ERR_INVALID_SCORE = 110;
const ERR_INVALID_RENEWAL_PERIOD = 111;
const ERR_CERT_ALREADY_EXISTS = 106;
const ERR_CERT_NOT_FOUND = 107;
const ERR_MAX_CERTS_EXCEEDED = 114;
const ERR_INVALID_CERT_TYPE = 115;
const ERR_INVALID_COMPLIANCE_LEVEL = 116;
const ERR_INVALID_GRACE_PERIOD = 117;
const ERR_INVALID_LOCATION = 118;
const ERR_INVALID_CATEGORY = 119;
const ERR_INVALID_REVIEW_RATE = 120;
const ERR_INVALID_PROOF_HASH = 121;
const ERR_INVALID_METRICS = 122;
const ERR_INVALID_REVOKE_REASON = 123;
const ERR_AUTHORITY_NOT_SET = 124;
const ERR_INVALID_UPDATE_PARAM = 113;

interface Certification {
  certId: number;
  auditorId: string;
  issueDate: number;
  expiryDate: number;
  status: boolean;
  score: number;
  renewalPeriod: number;
  certType: string;
  complianceLevel: number;
  gracePeriod: number;
  location: string;
  category: string;
  reviewRate: number;
  proofHash: Uint8Array;
  metrics: { carbon: number; waste: number; energy: number };
}

interface CertUpdate {
  updateScore: number;
  updateExpiry: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class CertificationRegistryMock {
  state: {
    nextCertId: number;
    maxCerts: number;
    issuanceFee: number;
    authorityContract: string | null;
    certifications: Map<string, Certification>;
    certUpdates: Map<string, CertUpdate>;
    certifiedBusinesses: Map<number, string>;
  } = {
    nextCertId: 0,
    maxCerts: 10000,
    issuanceFee: 500,
    authorityContract: null,
    certifications: new Map(),
    certUpdates: new Map(),
    certifiedBusinesses: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextCertId: 0,
      maxCerts: 10000,
      issuanceFee: 500,
      authorityContract: null,
      certifications: new Map(),
      certUpdates: new Map(),
      certifiedBusinesses: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setIssuanceFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.issuanceFee = newFee;
    return { ok: true, value: true };
  }

  issueCertification(
    businessId: string,
    auditorId: string,
    issueDate: number,
    expiryDate: number,
    score: number,
    renewalPeriod: number,
    certType: string,
    complianceLevel: number,
    gracePeriod: number,
    location: string,
    category: string,
    reviewRate: number,
    proofHash: Uint8Array,
    metrics: { carbon: number; waste: number; energy: number }
  ): Result<number> {
    if (this.state.nextCertId >= this.state.maxCerts) return { ok: false, value: ERR_MAX_CERTS_EXCEEDED };
    if (issueDate > this.blockHeight) return { ok: false, value: ERR_INVALID_ISSUE_DATE };
    if (expiryDate <= this.blockHeight) return { ok: false, value: ERR_INVALID_EXPIRY_DATE };
    if (score < 0 || score > 100) return { ok: false, value: ERR_INVALID_SCORE };
    if (renewalPeriod <= 0) return { ok: false, value: ERR_INVALID_RENEWAL_PERIOD };
    if (!["eco", "green", "sustainable"].includes(certType)) return { ok: false, value: ERR_INVALID_CERT_TYPE };
    if (complianceLevel < 1 || complianceLevel > 5) return { ok: false, value: ERR_INVALID_COMPLIANCE_LEVEL };
    if (gracePeriod > 90) return { ok: false, value: ERR_INVALID_GRACE_PERIOD };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!category || category.length > 50) return { ok: false, value: ERR_INVALID_CATEGORY };
    if (reviewRate > 10) return { ok: false, value: ERR_INVALID_REVIEW_RATE };
    if (proofHash.length !== 32) return { ok: false, value: ERR_INVALID_PROOF_HASH };
    if (metrics.carbon <= 0 || metrics.waste <= 0 || metrics.energy <= 0) return { ok: false, value: ERR_INVALID_METRICS };
    if (this.state.certifications.has(businessId)) return { ok: false, value: ERR_CERT_ALREADY_EXISTS };
    if (this.caller !== auditorId) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_SET };

    this.stxTransfers.push({ amount: this.state.issuanceFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextCertId;
    const cert: Certification = {
      certId: id,
      auditorId,
      issueDate,
      expiryDate,
      status: true,
      score,
      renewalPeriod,
      certType,
      complianceLevel,
      gracePeriod,
      location,
      category,
      reviewRate,
      proofHash,
      metrics,
    };
    this.state.certifications.set(businessId, cert);
    this.state.certifiedBusinesses.set(id, businessId);
    this.state.nextCertId++;
    return { ok: true, value: id };
  }

  getCertification(businessId: string): Certification | null {
    return this.state.certifications.get(businessId) || null;
  }

  revokeCertification(businessId: string, reason: string): Result<boolean> {
    const cert = this.state.certifications.get(businessId);
    if (!cert) return { ok: false, value: false };
    if (cert.auditorId !== this.caller) return { ok: false, value: false };
    if (!reason || reason.length > 200) return { ok: false, value: false };
    const updated: Certification = { ...cert, status: false };
    this.state.certifications.set(businessId, updated);
    return { ok: true, value: true };
  }

  updateCertification(businessId: string, newScore: number, newExpiry: number): Result<boolean> {
    const cert = this.state.certifications.get(businessId);
    if (!cert) return { ok: false, value: false };
    if (cert.auditorId !== this.caller) return { ok: false, value: false };
    if (newScore < 0 || newScore > 100) return { ok: false, value: false };
    if (newExpiry <= this.blockHeight) return { ok: false, value: false };
    const updated: Certification = { ...cert, score: newScore, expiryDate: newExpiry };
    this.state.certifications.set(businessId, updated);
    this.state.certUpdates.set(businessId, {
      updateScore: newScore,
      updateExpiry: newExpiry,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getCertCount(): Result<number> {
    return { ok: true, value: this.state.nextCertId };
  }

  checkCertValidity(businessId: string): Result<boolean> {
    const cert = this.state.certifications.get(businessId);
    if (!cert) return { ok: true, value: false };
    return { ok: true, value: cert.status && this.blockHeight < cert.expiryDate };
  }

  isCertified(businessId: string): boolean {
    return this.state.certifications.has(businessId);
  }
}

describe("CertificationRegistry", () => {
  let contract: CertificationRegistryMock;

  beforeEach(() => {
    contract = new CertificationRegistryMock();
    contract.reset();
  });

  it("issues a certification successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST3AUDITOR";
    const proofHash = new Uint8Array(32).fill(0);
    const metrics = { carbon: 100, waste: 50, energy: 200 };
    const result = contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      100,
      80,
      365,
      "eco",
      4,
      30,
      "Costa Rica",
      "Tourism",
      5,
      proofHash,
      metrics
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const cert = contract.getCertification("ST1BUSINESS");
    expect(cert?.certId).toBe(0);
    expect(cert?.auditorId).toBe("ST3AUDITOR");
    expect(cert?.issueDate).toBe(0);
    expect(cert?.expiryDate).toBe(100);
    expect(cert?.status).toBe(true);
    expect(cert?.score).toBe(80);
    expect(cert?.renewalPeriod).toBe(365);
    expect(cert?.certType).toBe("eco");
    expect(cert?.complianceLevel).toBe(4);
    expect(cert?.gracePeriod).toBe(30);
    expect(cert?.location).toBe("Costa Rica");
    expect(cert?.category).toBe("Tourism");
    expect(cert?.reviewRate).toBe(5);
    expect(cert?.proofHash).toEqual(proofHash);
    expect(cert?.metrics).toEqual(metrics);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST3AUDITOR", to: "ST2TEST" }]);
  });

  it("rejects duplicate certification", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST3AUDITOR";
    const proofHash = new Uint8Array(32).fill(0);
    const metrics = { carbon: 100, waste: 50, energy: 200 };
    contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      100,
      80,
      365,
      "eco",
      4,
      30,
      "Costa Rica",
      "Tourism",
      5,
      proofHash,
      metrics
    );
    const result = contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      200,
      90,
      730,
      "green",
      5,
      60,
      "Brazil",
      "Hospitality",
      8,
      proofHash,
      metrics
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_CERT_ALREADY_EXISTS);
  });

  it("rejects non-auditor issuance", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST4FAKE";
    const proofHash = new Uint8Array(32).fill(0);
    const metrics = { carbon: 100, waste: 50, energy: 200 };
    const result = contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      100,
      80,
      365,
      "eco",
      4,
      30,
      "Costa Rica",
      "Tourism",
      5,
      proofHash,
      metrics
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects issuance without authority contract", () => {
    contract.caller = "ST3AUDITOR";
    const proofHash = new Uint8Array(32).fill(0);
    const metrics = { carbon: 100, waste: 50, energy: 200 };
    const result = contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      100,
      80,
      365,
      "eco",
      4,
      30,
      "Costa Rica",
      "Tourism",
      5,
      proofHash,
      metrics
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_SET);
  });

  it("rejects invalid score", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST3AUDITOR";
    const proofHash = new Uint8Array(32).fill(0);
    const metrics = { carbon: 100, waste: 50, energy: 200 };
    const result = contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      100,
      101,
      365,
      "eco",
      4,
      30,
      "Costa Rica",
      "Tourism",
      5,
      proofHash,
      metrics
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_SCORE);
  });

  it("rejects invalid cert type", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST3AUDITOR";
    const proofHash = new Uint8Array(32).fill(0);
    const metrics = { carbon: 100, waste: 50, energy: 200 };
    const result = contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      100,
      80,
      365,
      "invalid",
      4,
      30,
      "Costa Rica",
      "Tourism",
      5,
      proofHash,
      metrics
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CERT_TYPE);
  });

  it("revokes a certification successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST3AUDITOR";
    const proofHash = new Uint8Array(32).fill(0);
    const metrics = { carbon: 100, waste: 50, energy: 200 };
    contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      100,
      80,
      365,
      "eco",
      4,
      30,
      "Costa Rica",
      "Tourism",
      5,
      proofHash,
      metrics
    );
    const result = contract.revokeCertification("ST1BUSINESS", "Non-compliance");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const cert = contract.getCertification("ST1BUSINESS");
    expect(cert?.status).toBe(false);
  });

  it("rejects revoke for non-existent cert", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.revokeCertification("STNONEXIST", "Reason");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects revoke by non-auditor", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST3AUDITOR";
    const proofHash = new Uint8Array(32).fill(0);
    const metrics = { carbon: 100, waste: 50, energy: 200 };
    contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      100,
      80,
      365,
      "eco",
      4,
      30,
      "Costa Rica",
      "Tourism",
      5,
      proofHash,
      metrics
    );
    contract.caller = "ST4FAKE";
    const result = contract.revokeCertification("ST1BUSINESS", "Reason");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("updates a certification successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST3AUDITOR";
    const proofHash = new Uint8Array(32).fill(0);
    const metrics = { carbon: 100, waste: 50, energy: 200 };
    contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      100,
      80,
      365,
      "eco",
      4,
      30,
      "Costa Rica",
      "Tourism",
      5,
      proofHash,
      metrics
    );
    const result = contract.updateCertification("ST1BUSINESS", 90, 200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const cert = contract.getCertification("ST1BUSINESS");
    expect(cert?.score).toBe(90);
    expect(cert?.expiryDate).toBe(200);
    const update = contract.state.certUpdates.get("ST1BUSINESS");
    expect(update?.updateScore).toBe(90);
    expect(update?.updateExpiry).toBe(200);
    expect(update?.updater).toBe("ST3AUDITOR");
  });

  it("rejects update for non-existent cert", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateCertification("STNONEXIST", 90, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-auditor", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST3AUDITOR";
    const proofHash = new Uint8Array(32).fill(0);
    const metrics = { carbon: 100, waste: 50, energy: 200 };
    contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      100,
      80,
      365,
      "eco",
      4,
      30,
      "Costa Rica",
      "Tourism",
      5,
      proofHash,
      metrics
    );
    contract.caller = "ST4FAKE";
    const result = contract.updateCertification("ST1BUSINESS", 90, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets issuance fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setIssuanceFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.issuanceFee).toBe(1000);
  });

  it("rejects issuance fee change without authority", () => {
    const result = contract.setIssuanceFee(1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct cert count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST3AUDITOR";
    const proofHash = new Uint8Array(32).fill(0);
    const metrics = { carbon: 100, waste: 50, energy: 200 };
    contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      100,
      80,
      365,
      "eco",
      4,
      30,
      "Costa Rica",
      "Tourism",
      5,
      proofHash,
      metrics
    );
    contract.issueCertification(
      "ST2BUSINESS",
      "ST3AUDITOR",
      0,
      200,
      90,
      730,
      "green",
      5,
      60,
      "Brazil",
      "Hospitality",
      8,
      proofHash,
      metrics
    );
    const result = contract.getCertCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks cert validity correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST3AUDITOR";
    const proofHash = new Uint8Array(32).fill(0);
    const metrics = { carbon: 100, waste: 50, energy: 200 };
    contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      100,
      80,
      365,
      "eco",
      4,
      30,
      "Costa Rica",
      "Tourism",
      5,
      proofHash,
      metrics
    );
    contract.blockHeight = 50;
    const result = contract.checkCertValidity("ST1BUSINESS");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    contract.blockHeight = 150;
    const result2 = contract.checkCertValidity("ST1BUSINESS");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("rejects issuance with invalid proof hash", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST3AUDITOR";
    const proofHash = new Uint8Array(31).fill(0);
    const metrics = { carbon: 100, waste: 50, energy: 200 };
    const result = contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      100,
      80,
      365,
      "eco",
      4,
      30,
      "Costa Rica",
      "Tourism",
      5,
      proofHash,
      metrics
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PROOF_HASH);
  });

  it("rejects issuance with max certs exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST3AUDITOR";
    const proofHash = new Uint8Array(32).fill(0);
    const metrics = { carbon: 100, waste: 50, energy: 200 };
    contract.state.maxCerts = 1;
    contract.issueCertification(
      "ST1BUSINESS",
      "ST3AUDITOR",
      0,
      100,
      80,
      365,
      "eco",
      4,
      30,
      "Costa Rica",
      "Tourism",
      5,
      proofHash,
      metrics
    );
    const result = contract.issueCertification(
      "ST2BUSINESS",
      "ST3AUDITOR",
      0,
      200,
      90,
      730,
      "green",
      5,
      60,
      "Brazil",
      "Hospitality",
      8,
      proofHash,
      metrics
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_CERTS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });
});