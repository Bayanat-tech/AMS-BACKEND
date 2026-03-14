export const userPermissionQuery = `
  SELECT 
    a.COMPANY_CODE,
    a.ROLE_ID,
    a.SERIAL_NO,
    a.SNEW, a.SMODIFY, a.SDELETE, a.SSAVE, a.SSEARCH, a.SSAVEAS, 
    a.SUPLOAD, a.SUNDO, a.SPRINT, a.SPRINTSETUP, a.SHELP, 
    a.USER_DT, a.USERID, a.CREATE_USER, a.CREATE_DATE,
    b.LOGINID
FROM SEC_ROLE_APP_ACCESS a
JOIN SEC_ROLE_FUNCTION_ACCESS_USER b ON a.ROLE_ID = b.SERIAL_NO_OR_ROLE_ID
WHERE b.LOGINID = :loginid

UNION

SELECT 
    COMPANY_CODE,
    SERIAL_NO_OR_ROLE_ID AS ROLE_ID,
    SERIAL_NO_OR_ROLE_ID AS SERIAL_NO, 
    SNEW, SMODIFY, SDELETE, SSAVE, SSEARCH, SSAVEAS, 
    SUPLOAD, SUNDO, SPRINT, SPRINTSETUP, SHELP, 
    USER_DT, USERID, CREATE_USER, CREATE_DATE,
    LOGINID
FROM SEC_ROLE_FUNCTION_ACCESS_USER 
WHERE LOGINID = :loginid
  AND SERIAL_NO_OR_ROLE_ID < 90001
`;
export const permissionsListQuery = `
SELECT DISTINCT 
  app_code AS menu, 
  '0' AS "level", 
  0 AS serial_no, 
  app_code 
FROM SEC_MODULE_DATA 
WHERE (LTRIM(RTRIM(level2)) IS NULL OR LTRIM(RTRIM(level2)) = ' ' OR LENGTH(LTRIM(RTRIM(level2))) = 0)
   OR (LTRIM(RTRIM(level1)) IS NULL OR LTRIM(RTRIM(level1)) = ' ' OR LENGTH(LTRIM(RTRIM(level1))) = 0)

UNION ALL

SELECT 
  level1 AS menu, 
  app_code AS "level", 
  serial_no, 
  app_code AS app_code 
FROM SEC_MODULE_DATA 
WHERE (LTRIM(RTRIM(level2)) IS NULL OR LTRIM(RTRIM(level2)) = ' ' OR LENGTH(LTRIM(RTRIM(level2))) = 0)
   OR (LTRIM(RTRIM(level1)) IS NULL OR LTRIM(RTRIM(level1)) = ' ' OR LENGTH(LTRIM(RTRIM(level1))) = 0)

UNION ALL

SELECT 
  level2 AS menu, 
  level1 AS "level", 
  serial_no, 
  (SELECT app_code FROM SEC_MODULE_DATA WHERE (LTRIM(RTRIM(level1)) IS NOT NULL AND LTRIM(RTRIM(level1)) != ' ') AND ROWNUM = 1) AS app_code 
FROM SEC_MODULE_DATA 
WHERE (LTRIM(RTRIM(level3)) IS NULL OR LTRIM(RTRIM(level3)) = ' ' OR LENGTH(LTRIM(RTRIM(level3))) = 0) 
  AND (LTRIM(RTRIM(level2)) IS NOT NULL AND LTRIM(RTRIM(level2)) != ' ' AND LENGTH(LTRIM(RTRIM(level2))) > 0)

UNION ALL

SELECT 
  a.level3 AS menu, 
  a.level2 AS "level", 
  a.serial_no,
  (SELECT app_code FROM SEC_MODULE_DATA b 
   WHERE LTRIM(RTRIM(a.level1)) = LTRIM(RTRIM(b.level1)) 
     AND LTRIM(RTRIM(a.level3)) = LTRIM(RTRIM(b.level3))  
     AND LTRIM(RTRIM(a.level2)) = LTRIM(RTRIM(b.level2)) 
     AND ROWNUM = 1) AS app_code 
FROM SEC_MODULE_DATA a
WHERE (LTRIM(RTRIM(a.level3)) IS NOT NULL AND LTRIM(RTRIM(a.level3)) != ' ' AND LENGTH(LTRIM(RTRIM(a.level3))) > 0) 
  AND (LTRIM(RTRIM(a.level2)) IS NOT NULL AND LTRIM(RTRIM(a.level2)) != ' ' AND LENGTH(LTRIM(RTRIM(a.level2))) > 0)
`;

export const getChequePaymentInvoiceDetail = `
SELECT TR_AC_INVDETAIL.inv_no, 
dtl_sr_no, 
doc_no,
max(inv_date) inv_date,  
00000000.00 amount,  
1 sign_ind,  
TR_AC_INVDETAIL.ac_code,  
TR_AC_INVDETAIL.company_code,  
sum(lcur_amount * sign_ind) inv_amt,  
' ' c_curr_code,  
0000000000.0000 c_curr_amt,  
'N' c_indicator_origin,  
max( case when indicator_origin='Y' then curr_code end) c_curr_code_origin,  
max( case when indicator_origin='Y' then ex_rate end) c_ex_rate_origin,  
(sum(amount_origin * sign_ind)/max(ex_rate_origin)) c_bal_amt_org,
div_code
FROM TR_AC_INVDETAIL  
WHERE ( TR_AC_INVDETAIL.company_code = :company_code ) AND  
( TR_AC_INVDETAIL.ac_code = :ac_code ) AND  
( TR_AC_INVDETAIL.div_code = :div_code ) AND  
( trim(TR_AC_INVDETAIL.doc_type) || trim(doc_no) || trim(serial_no) <> :invrsno )  
GROUP BY TR_AC_INVDETAIL.company_code,  
TR_AC_INVDETAIL.ac_code,  
TR_AC_INVDETAIL.inv_no  ,
TR_AC_INVDETAIL.div_code
  HAVING ( round(sum(lcur_amount * sign_ind),3)  <> 0 );`;

export const getWareHouseUtilization = `SELECT 
    C.TXN_DATE, 
    C.SITE_CODE, 
    SUM(U.PLT_NOS) AS PLT_CNT, 
    AVG(C.PLT_CAPACITY) AS CAPACITY,
    (SELECT SITE_NAME FROM MS_SITE WHERE SITE_CODE = C.SITE_CODE) AS SITE_name
FROM 
    PLT_UTIL_MAIN_CAPACITY C
LEFT JOIN 
    PLT_UTIL_MAIN U 
ON 
    C.TXN_DATE = U.TXN_DATE AND C.SITE_CODE = U.SITE_CODE
WHERE 
    C.SITE_CODE IN (:site_code)
     AND C.txn_date >= STR_TO_DATE(:start_date, '%d %b %Y')
  AND C.txn_date <= STR_TO_DATE(:end_date, '%d %b %Y')
GROUP BY 
    C.TXN_DATE, C.SITE_CODE;`;

export const getTallyProductDataQ = `
SELECT A.P_UOM,A.L_UOM,A.UPPP,B.UOM_COUNT,A.QTY_PUOM,A.QTY_LUOM,A.QUANTITY,A.PACKDET_NO
 FROM TI_PACKDET A,
 MS_PRODUCT B WHERE 
 A.PRIN_CODE =:prin_code  AND
 A.JOB_NO = :job_no AND
 A.CONTAINER_NO = :container_no AND 
 A.CLEARANCE = 'Y' AND
 A.PDA_QUANTITY = 0 AND
 A.COMPANY_CODE = B.COMPANY_CODE AND
 A.PRIN_CODE = B.PRIN_CODE AND
 A.PROD_CODE = B.PROD_CODE;`;
